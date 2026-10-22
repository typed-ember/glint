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

const VOLAR_PROXY = '@volar/typescript proxyCreateProgram.js';
const TSC = 'typescript solution-builder watch reuse';

// Volar's `proxyCreateProgram` keeps its language instance and module
// resolution cache per `configFilePath`, but `sourceFileSnapshots` is one map
// for the whole process. Each entry holds the SourceFile it was made from.
//
// With project references, one physical file is a different SourceFile object
// in each project.
// So under `tsc -b`, each project switch replaces the snapshot,
// and volar transforms that .gts file again.
//
// The map also keeps the last SourceFile of every file
// until the process exits.
//
// Move the map onto volar's per-project state.
// Then it is released together with the project's language.
//
// Tracking: https://github.com/typed-ember/glint/issues/1199 /
// upstream https://github.com/volarjs/volar.js/issues/314
export function applyProxyPatches(source: string): string {
  source = replaceExactlyOnce(
    source,
    `    const sourceFileSnapshots = new language_core_1.FileMap(ts.sys.useCaseSensitiveFileNames);`,
    `    let sourceFileSnapshots;`,
    VOLAR_PROXY,
    'sourceFileSnapshots declaration',
  );

  source = replaceExactlyOnce(
    source,
    `            const { languagePlugins, language, moduleResolutionCache } = state;`,
    `            const { languagePlugins, language, moduleResolutionCache } = state;
            sourceFileSnapshots = state.sourceFileSnapshots ??= new language_core_1.FileMap(ts.sys.useCaseSensitiveFileNames);`,
    VOLAR_PROXY,
    'per-project state destructuring',
  );

  return source;
}

// `tsc -b --watch` reconstructs each project's Program from scratch on every
// file change: the solution builder unconditionally releases the built Program
// (`afterProgramDone` -> `releaseProgram()`) so `oldProgram` never reaches
// `createProgram`, and its compiler host (unlike plain `--watch`'s) has no
// SourceFile cache across iterations. For a 19,286-file project a one-line
// change cost 30s (Parse 7.3s + ResolveModule 7.2s + re-transform of every
// .gts); with these patches and the per-project snapshots above, the same
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
