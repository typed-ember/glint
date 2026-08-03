// Source-level patches we apply to the *compiled* sources of `typescript` and
// `@volar/typescript` as they are read off disk (see `patchCompilerSourcesForGts`
// in `run-volar-tsc.ts`).
//
// Every patch matches an exact, verbatim slice of the dependency's compiled
// output and fails loudly if that slice is missing or ambiguous, so a dependency
// upgrade produces an actionable error at startup instead of silently dropping
// the behavior. They are exported so `__tests__/tsc-source-patches.test.ts` can
// assert they still apply against the installed dependency versions.

function failPatch(target: string, what: string, detail: string): never {
  throw new Error(
    `[glint] failed to patch ${target} (${what}): ${detail}. ` +
      `The dependency may have changed; update tsc-source-patches.ts.`,
  );
}

// Replaces the single occurrence of `needle`. Both "not found" and "found more
// than once" are hard errors: these patches used to rely on `String.replace`,
// which silently rewrites only the *first* match, so a dependency upgrade that
// duplicated an anchor would have patched an arbitrary one of the call sites.
export function replaceExactlyOnce(
  source: string,
  needle: string,
  replacement: string,
  target: string,
  what: string,
): string {
  const first = source.indexOf(needle);
  if (first === -1) {
    failPatch(target, what, 'source not found in expected shape');
  }
  if (source.indexOf(needle, first + needle.length) !== -1) {
    failPatch(target, what, 'expected exactly one occurrence but found several');
  }
  return source.slice(0, first) + replacement + source.slice(first + needle.length);
}

function replacePatternExactlyOnce(
  source: string,
  pattern: RegExp,
  replacement: string,
  target: string,
  what: string,
): string {
  const matches = source.match(new RegExp(pattern.source, `${pattern.flags.replace('g', '')}g`));
  if (!matches) {
    failPatch(target, what, 'source not found in expected shape');
  }
  if (matches.length > 1) {
    failPatch(target, what, 'expected exactly one occurrence but found several');
  }
  return source.replace(pattern, replacement);
}

const VOLAR_PROXY = '@volar/typescript proxyCreateProgram.js';
const TSC = 'typescript solution-builder watch reuse';

// Volar's proxyCreateProgram fast-paths module resolution back to the
// original compiler host when no import literal ends in a `.gts`/`.gjs`
// extension. In one-shot `tsc` the original host has no resolver, so volar's
// wrapper (which makes `Bang.gts` look like `Bang.d.ts` to tsc's extensionless
// resolver via `resolveHiddenExtensions`) runs and extensionless imports work.
// But `tsc --watch` installs a cached resolver on the host before volar's
// proxy runs, so extensionless `.gts` imports skip the wrapper and fail with
// TS2307. Patch the compiled volar source so the fast-path is also disabled
// whenever any plugin sets `resolveHiddenExtensions: true`.
//
// Upstream fix: https://github.com/volarjs/volar.js/pull/309 — once that ships
// in a `@volar/typescript` release we depend on, this monkey-patch can go.
// Tracking: https://github.com/typed-ember/glint/issues/806
export function applyProxyPatches(source: string): string {
  const guard = '!languagePlugins.some(p => p.typescript?.resolveHiddenExtensions) && ';

  const literalsPattern =
    /(if \(resolveModuleNameLiterals\s+&& )(moduleLiterals\.every\(name => !pluginExtensions\.some\(ext => name\.text\.endsWith\(ext\)\)\)\) \{)/;
  const namesPattern =
    /(if \(resolveModuleNames && )(moduleNames\.every\(name => !pluginExtensions\.some\(ext => name\.endsWith\(ext\)\)\)\) \{)/;

  source = replacePatternExactlyOnce(
    source,
    literalsPattern,
    `$1${guard}$2`,
    VOLAR_PROXY,
    'resolveModuleNameLiterals fast-path condition',
  );
  source = replacePatternExactlyOnce(
    source,
    namesPattern,
    `$1${guard}$2`,
    VOLAR_PROXY,
    'resolveModuleNames fast-path condition',
  );
  source = patchProxyPerProjectCaches(source);
  return source;
}

// Volar's `proxyCreateProgram` keeps its language instance, virtual-file
// snapshots, and moduleResolutionCache in a SINGLE slot, invalidated whenever
// `createProgram` is called with different rootNames/options than the previous
// call. That assumption holds for one-project processes (plain `tsc`,
// `vue-tsc`), but under `tsc -b` a single process builds MANY projects, so
// every project's build evicts the previous project's cache: each watch
// iteration re-transforms every .gts file and re-resolves every import.
// Key the cache per `configFilePath` instead.
//
// Lifetime: entries are held only for as long as the corresponding project's
// Program is alive. Volar's `decorateProgram()` installs closures over
// `language` onto the Program, so a live Program is a strong reference to its
// language; we keep only a `WeakRef` here and let a `FinalizationRegistry` drop
// the entry once the Program is gone. That means the cache follows the programs
// retained by `patchTscSolutionBuilderWatchReuse` without growing without
// bound, and projects that leave the build graph are released automatically —
// no eviction policy to tune.
//
// Measured effect (19,286-file project, one-line change, together with the
// solution-builder patches below): ResolveModule 7.2s -> 0.0s, iteration
// 30s -> ~2s. Tracking: https://github.com/typed-ember/glint/issues/1199 /
// upstream https://github.com/volarjs/volar.js/issues/314
export function patchProxyPerProjectCaches(source: string): string {
  // Replace the whole single-slot declaration block so the expected shape is
  // asserted in one place.
  const declarations = `    const sourceFileSnapshots = new language_core_1.FileMap(ts.sys.useCaseSensitiveFileNames);
    const parsedSourceFiles = new WeakMap();
    let lastOptions;
    let languagePlugins;
    let language;
    let moduleResolutionCache;`;

  source = replaceExactlyOnce(
    source,
    declarations,
    `    const projectCaches = new Map();
    const projectCacheRegistry = typeof FinalizationRegistry === "function"
        ? new FinalizationRegistry((held) => {
            if (held.caches.get(held.key) === held.entry) {
                held.caches.delete(held.key);
            }
        })
        : undefined;
    // Scoped per project alongside \`language\`. With project references the same
    // physical file is a different SourceFile object in each project, so a
    // process-global map here would both churn on every project switch and pin
    // every SourceFile it has ever seen for the lifetime of the process.
    let sourceFileSnapshots = new language_core_1.FileMap(ts.sys.useCaseSensitiveFileNames);
    // Keyed by SourceFile object, which is already per project, so this needs no
    // scoping and stays collectable along with the SourceFiles it describes.
    const parsedSourceFiles = new WeakMap();
    let lastOptions;
    let languagePlugins;
    let language;
    let moduleResolutionCache;`,
    VOLAR_PROXY,
    'single-slot cache declarations',
  );

  // Swap the current project's cache slot in at the top of every createProgram
  // call, and persist it back after the cache-rebuild block.
  const applyEntry = `            const options = args[0];
            assert(!!options.host, '!!options.host');
            if (!lastOptions`;

  source = replaceExactlyOnce(
    source,
    applyEntry,
    `            const options = args[0];
            assert(!!options.host, '!!options.host');
            const projectCacheKey = String(options.options.configFilePath ?? '');
            const projectCacheEntry = projectCacheKey ? projectCaches.get(projectCacheKey) : undefined;
            // A dead WeakRef means this project's Program has been released, so
            // its virtual code is gone too: fall through and rebuild.
            const cachedLanguage = projectCacheEntry && projectCacheEntry.languageRef.deref();
            if (cachedLanguage) {
                lastOptions = projectCacheEntry.lastOptions;
                languagePlugins = projectCacheEntry.languagePlugins;
                language = cachedLanguage;
                moduleResolutionCache = projectCacheEntry.moduleResolutionCache;
                sourceFileSnapshots = projectCacheEntry.sourceFileSnapshots;
            }
            else {
                lastOptions = languagePlugins = language = moduleResolutionCache = undefined;
                sourceFileSnapshots = new language_core_1.FileMap(ts.sys.useCaseSensitiveFileNames);
            }
            if (!lastOptions`,
    VOLAR_PROXY,
    'createProgram apply entry',
  );

  // Persist the (possibly rebuilt) slot right after the rebuild block closes —
  // anchored on the `const originalHost = options.host;` line that follows it.
  //
  // Note that a cached `language` closes over the `originalHost` of the call
  // that created it. Under `tsc -b` that is the solution builder's single
  // long-lived compiler host, so it stays valid across iterations; if TS ever
  // starts recreating that host per iteration, this cache has to be keyed on it.
  const afterRebuild = `            const originalHost = options.host;`;

  source = replaceExactlyOnce(
    source,
    afterRebuild,
    `            if (projectCacheKey) {
                const projectCacheValue = { lastOptions, languagePlugins, languageRef: new WeakRef(language), moduleResolutionCache, sourceFileSnapshots };
                projectCaches.set(projectCacheKey, projectCacheValue);
                if (projectCacheRegistry) {
                    projectCacheRegistry.register(language, { caches: projectCaches, key: projectCacheKey, entry: projectCacheValue });
                }
            }
            const originalHost = options.host;`,
    VOLAR_PROXY,
    'originalHost anchor',
  );

  return source;
}

// TypeScript's `tryGetJSExtensionForFile` maps a source file extension to the
// JS extension it emits (`.ts` -> `.js`, `.tsx` -> `.jsx`/`.js`, ...). It has no
// case for `.gts`/`.gjs`, even though we register them as supported TS
// extensions (so `hasTSFileExtension` is true for them). In build mode
// (`tsc -b`), declaration emit computes module specifiers for imported symbols;
// when the preferred ending is "js" (e.g. a sibling `./x.js` import is preserved
// in the emitted `.d.ts`) and the target is a `.gts`/`.gjs` file, tsc calls
// `getJSExtensionForFile`, which `Debug.fail`s with
// "Extension .gts is unsupported" and aborts the entire build. `.gts`/`.gjs`
// compile to `.js` (like `.ts`), so teach the function that mapping by
// short-circuiting at the top of the function. The proper home for this is
// volar's `transformTscContent` (which already patches `changeExtension` and the
// supported-extension lists); this monkey-patch can go once that lands upstream.
export function patchTscJsExtensionForGts(source: string): string {
  const pattern = /function tryGetJSExtensionForFile\(([A-Za-z0-9_$]+),[^)]*\)\s*\{/;
  const match = pattern.exec(source);
  if (!match) {
    failPatch(
      'typescript `tryGetJSExtensionForFile`',
      'function signature',
      'source not found in expected shape',
    );
  }
  const fileNameParam = match[1];
  return replacePatternExactlyOnce(
    source,
    pattern,
    `$&\n    if (/\\.g[jt]s$/.test(${fileNameParam})) return ".js";`,
    'typescript `tryGetJSExtensionForFile`',
    'function signature',
  );
}

// `tsc -b --watch` reconstructs each project's Program from scratch on every
// file change: the solution builder unconditionally releases the built Program
// (`afterProgramDone` -> `releaseProgram()`) so `oldProgram` never reaches
// `createProgram`, and its compiler host (unlike plain `--watch`'s) has no
// SourceFile cache across iterations. For a 19,286-file project a one-line
// change cost 30s (Parse 7.3s + ResolveModule 7.2s + re-transform of every
// .gts); with these patches (plus the per-project proxy caches above) the same
// iteration costs ~2s — identical to plain `--watch`. Retaining the programs is
// what costs memory (~+1.4GB RSS on that project); everything layered on top of
// them is held weakly so nothing outlives the programs themselves.
//
// Three patches:
//  1. afterProgramDone: keep programs alive in watch mode so oldProgram-based
//     SourceFile/resolution reuse engages.
//  2. setGetSourceFileAsHashVersioned: version-validated SourceFile cache so
//     unchanged files skip re-parsing. Only installed for the solution builder,
//     which can tell us which project is being built: with project references
//     the same physical file is a redirect in one program and a root in
//     another, so SourceFile objects must never be shared across projects.
//     Preserving object identity also keeps volar's parsedSourceFiles WeakMap
//     warm, which is what avoids re-transforming every .gts.
//  3. tryAddRoot: with a partially reused program, files that participate in a
//     project reference can lose their fileIncludeReasons keying (declaration
//     path vs mapped source path) and buildinfo emit crashed with
//     "Cannot read properties of undefined (reading 'some')".
//
// Tracking: https://github.com/typed-ember/glint/issues/1199 /
// upstream https://github.com/volarjs/volar.js/issues/314
export function patchTscSolutionBuilderWatchReuse(source: string): string {
  // 1. Retain programs across watch iterations.
  const releaseContext = `function afterProgramDone(state, program) {
  if (program) {
    if (state.host.afterProgramEmitAndDiagnostics) {
      state.host.afterProgramEmitAndDiagnostics(program);
    }
    program.releaseProgram();
  }`;

  source = replaceExactlyOnce(
    source,
    releaseContext,
    `function afterProgramDone(state, program) {
  if (program) {
    if (state.host.afterProgramEmitAndDiagnostics) {
      state.host.afterProgramEmitAndDiagnostics(program);
    }
    if (!state.watch) program.releaseProgram();
  }`,
    TSC,
    'afterProgramDone',
  );

  // 2. Version-validated, per-project SourceFile cache.
  //
  // `setGetSourceFileAsHashVersioned` has three call sites: the solution builder
  // (patched below to pass a scope), plain `--watch`, and
  // `createIncrementalCompilerHost`. Only the solution builder can name the
  // project currently being built, and only it rebuilds programs from scratch
  // every iteration. The other two hosts keep their own SourceFile caches and
  // would have no safe key to cache under, so they must keep stock behavior —
  // hence the `getCacheScope` gate rather than an unconditional cache.
  const hashVersioned = `function setGetSourceFileAsHashVersioned(compilerHost) {
  const originalGetSourceFile = compilerHost.getSourceFile;
  compilerHost.getSourceFile = (...args) => {
    const result = originalGetSourceFile.call(compilerHost, ...args);
    if (result) {
      result.version = getSourceFileVersionAsHashFromText(compilerHost, result.text);
    }
    return result;
  };
}`;

  source = replaceExactlyOnce(
    source,
    hashVersioned,
    `function setGetSourceFileAsHashVersioned(compilerHost, getCacheScope) {
  const originalGetSourceFile = compilerHost.getSourceFile;
  const stockGetSourceFile = (fileName, languageVersionOrOptions, onError, shouldCreateNewSourceFile) => {
    const result = originalGetSourceFile.call(compilerHost, fileName, languageVersionOrOptions, onError, shouldCreateNewSourceFile);
    if (result) {
      result.version = getSourceFileVersionAsHashFromText(compilerHost, result.text);
    }
    return result;
  };
  if (!getCacheScope) {
    compilerHost.getSourceFile = stockGetSourceFile;
    return;
  }
  // scope (configFilePath) -> fileName -> WeakRef<SourceFile>. Weak because the
  // point of the cache is to preserve SourceFile *identity* for files a retained
  // program still references; once a program is released, its SourceFiles should
  // be collectable, and files that leave the program must not be pinned.
  const sourceFileCaches = new Map();
  const sourceFileRegistry = typeof FinalizationRegistry === "function"
    ? new FinalizationRegistry((held) => {
      if (held.cache.get(held.fileName) === held.ref) {
        held.cache.delete(held.fileName);
      }
    })
    : undefined;
  compilerHost.getSourceFile = (fileName, languageVersionOrOptions, onError, shouldCreateNewSourceFile) => {
    const scope = getCacheScope();
    // Between projects the solution builder resets projectCompilerOptions to its
    // base options, which carry no configFilePath. Caching under a shared key
    // would mix SourceFiles across projects, which is exactly what project
    // references make unsound, so fall back to stock behavior.
    if (!scope) {
      return stockGetSourceFile(fileName, languageVersionOrOptions, onError, shouldCreateNewSourceFile);
    }
    let sourceFileCache = sourceFileCaches.get(scope);
    if (!sourceFileCache) {
      sourceFileCache = new Map();
      sourceFileCaches.set(scope, sourceFileCache);
    }
    const cachedRef = sourceFileCache.get(fileName);
    const cached = cachedRef && cachedRef.deref();
    // Only re-read the file when there is a cache entry worth validating, so a
    // cold build pays no extra I/O; a validated hit skips a full parse.
    if (cached && !shouldCreateNewSourceFile) {
      const resolvedLanguageVersion = typeof languageVersionOrOptions === "object" ? languageVersionOrOptions.languageVersion : languageVersionOrOptions;
      const impliedNodeFormat = typeof languageVersionOrOptions === "object" ? languageVersionOrOptions.impliedNodeFormat : void 0;
      if (cached.languageVersion === resolvedLanguageVersion && cached.impliedNodeFormat === impliedNodeFormat) {
        let text;
        try {
          text = compilerHost.readFile(fileName);
        }
        catch {
          // Let the stock path re-read and report through onError rather than
          // reporting the failure from here.
          text = undefined;
        }
        if (text !== undefined && cached.version === getSourceFileVersionAsHashFromText(compilerHost, text)) {
          return cached;
        }
      }
    }
    const result = stockGetSourceFile(fileName, languageVersionOrOptions, onError, shouldCreateNewSourceFile);
    if (result) {
      const ref = new WeakRef(result);
      sourceFileCache.set(fileName, ref);
      if (sourceFileRegistry) {
        sourceFileRegistry.register(result, { cache: sourceFileCache, fileName, ref });
      }
    }
    return result;
  };
}`,
    TSC,
    'setGetSourceFileAsHashVersioned',
  );

  // ...and pass the project scope at the solution-builder call site (the only
  // call site followed by getParsedCommandLine wiring).
  const builderCallSite = `  setGetSourceFileAsHashVersioned(compilerHost);
  compilerHost.getParsedCommandLine =`;

  source = replaceExactlyOnce(
    source,
    builderCallSite,
    `  setGetSourceFileAsHashVersioned(compilerHost, () => String(state.projectCompilerOptions.configFilePath ?? ""));
  compilerHost.getParsedCommandLine =`,
    TSC,
    'solution builder host call site',
  );

  // 3. Tolerate missing include reasons during buildinfo emit of a reused
  //    program -- but only for files that demonstrably are not roots.
  //
  //    `tryAddRoot` is called for every file in the program and uses the
  //    RootFile include reason to decide which ones belong in the buildinfo
  //    `root` list. Under a partially reused program a file that participates in
  //    a project reference can have its reasons recorded under a different path
  //    than the one it is keyed by here, leaving the lookup undefined.
  //
  //    Skipping such a file is only correct if it really is not a root: `root`
  //    is persisted into .tsbuildinfo, so silently omitting a genuine root would
  //    let a later build consider the project up to date when it is not. The
  //    enclosing `getBuildInfo2` already computes `rootFileNames` (the program's
  //    actual roots), so cross-check against it and fail loudly if the
  //    include-reasons map really is out of sync for a root.
  //    The guard below reads `rootFileNames` out of the enclosing scope, so
  //    assert that binding still exists: otherwise the patch would apply
  //    cleanly and then throw a ReferenceError during buildinfo emit, which is
  //    exactly the sort of late, confusing failure these assertions exist to
  //    prevent. (Verified present in `getBuildInfo2` on TS 5.9 and 6.0.)
  const rootFileNamesDecl = `  const rootFileNames = new Set(state.program.getRootFileNames().map((f) => toPath(f, currentDirectory, state.program.getCanonicalFileName)));`;
  if (!source.includes(rootFileNamesDecl)) {
    failPatch(TSC, 'rootFileNames binding', 'source not found in expected shape');
  }

  const tryAddRoot = `    const file = state.program.getSourceFile(path);
    if (!state.program.getFileIncludeReasons().get(file.path).some((r) => r.kind === 0 /* RootFile */)) return;`;

  source = replaceExactlyOnce(
    source,
    tryAddRoot,
    `    const file = state.program.getSourceFile(path);
    const reasons = file && state.program.getFileIncludeReasons().get(file.path);
    if (!reasons) {
      if (file && (rootFileNames.has(path) || rootFileNames.has(file.path))) {
        throw new Error("[glint] buildinfo emit: no file include reasons for root file " + path + ". " + "This is a bug in glint's tsc program-reuse patches (see tsc-source-patches.ts); " + "please report it at https://github.com/typed-ember/glint/issues with the project layout.");
      }
      return;
    }
    if (!reasons.some((r) => r.kind === 0 /* RootFile */)) return;`,
    TSC,
    'tryAddRoot',
  );

  return source;
}
