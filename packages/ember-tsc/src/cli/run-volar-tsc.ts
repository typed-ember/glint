import { runTsc } from '@volar/typescript/lib/quickstart/runTsc.js';
import type ts from 'typescript';
import { createEmberLanguagePlugin } from '../volar/ember-language-plugin.js';
import { findConfig } from '../config/index.js';
import { VirtualGtsCode } from '../volar/gts-virtual-code.js';
import { getTransformErrorDiagnostics } from '../transform/diagnostics/transform-errors.js';

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
// Loaded via CJS require so we can monkey-patch readFileSync; the ESM namespace
// object would be frozen.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('node:fs') as typeof import('node:fs');

export function run(): void {
  patchCompilerSourcesForGts();
  patchVolarDecorateProgramForContentTagErrors();

  let cwd = process.cwd();

  const options = {
    extraSupportedExtensions: ['.gjs', '.gts'],

    // With the below configuration `{basename.gts}` will produce `{basename}.d.ts`
    // This is in line with how V2 addons build their components.
    // At build time, `.gts` components are emitted as `.js` files, so that's why the corresponding declarations should be `.d.ts`
    //
    // Please refer to https://github.com/typed-ember/glint/issues/988 for more information
    //
    // Before this option, glint emitted broken declarations in which relative imports to other .gts files did not strip extensions (https://github.com/typed-ember/glint/issues/628).
    // The declarations outputted by volar's runTsc luckily also remove extension in imports.
    extraExtensionsToRemove: ['.gjs', '.gts'],
  };

  const main = (): void =>
    runTsc(require.resolve('typescript/lib/tsc'), options, (ts, options) => {
      const glintConfig = findConfig(cwd);

      if (glintConfig) {
        const gtsLanguagePlugin = createEmberLanguagePlugin(glintConfig);
        return [gtsLanguagePlugin];
      } else {
        return [];
      }
    });
  main();
}

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
function patchCompilerSourcesForGts(): void {
  const originalReadFileSync = fs.readFileSync;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (fs as any).readFileSync = function (...args: unknown[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (originalReadFileSync as any).apply(fs, args);
    const filePath = args[0];
    if (typeof filePath !== 'string') {
      return result;
    }
    if (filePath.endsWith('/proxyCreateProgram.js')) {
      const text = typeof result === 'string' ? result : (result as Buffer).toString('utf8');
      const patched = applyProxyPatches(text);
      return typeof result === 'string' ? patched : Buffer.from(patched);
    }
    // The compiled tsc source (read here on its way to volar's runTsc).
    if (/\/typescript\/lib\/[^/]+\.js$/.test(filePath)) {
      const text = typeof result === 'string' ? result : (result as Buffer).toString('utf8');
      if (text.includes('function tryGetJSExtensionForFile(')) {
        let patched = patchTscJsExtensionForGts(text);
        patched = patchTscSolutionBuilderWatchReuse(patched);
        return typeof result === 'string' ? patched : Buffer.from(patched);
      }
    }
    return result;
  };
}

function applyProxyPatches(source: string): string {
  const guard = '!languagePlugins.some(p => p.typescript?.resolveHiddenExtensions) && ';

  const literalsPattern =
    /(if \(resolveModuleNameLiterals\s+&& )(moduleLiterals\.every\(name => !pluginExtensions\.some\(ext => name\.text\.endsWith\(ext\)\)\)\) \{)/;
  const namesPattern =
    /(if \(resolveModuleNames && )(moduleNames\.every\(name => !pluginExtensions\.some\(ext => name\.endsWith\(ext\)\)\)\) \{)/;

  if (!literalsPattern.test(source) || !namesPattern.test(source)) {
    throw new Error(
      '[glint] failed to patch @volar/typescript proxyCreateProgram.js: ' +
        'fast-path conditions not found in expected shape. ' +
        'The volar dep may have changed; update applyProxyPatches() in run-volar-tsc.ts.',
    );
  }

  source = source.replace(literalsPattern, `$1${guard}$2`).replace(namesPattern, `$1${guard}$2`);
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
// Measured effect (19,286-file project, one-line change, together with the
// solution-builder patches below): ResolveModule 7.2s -> 0.0s, iteration
// 30s -> ~2s. Tracking: https://github.com/typed-ember/glint/issues/1199 /
// upstream https://github.com/volarjs/volar.js/issues/314
function patchProxyPerProjectCaches(source: string): string {
  const declarations = `    let lastOptions;
    let languagePlugins;
    let language;
    let moduleResolutionCache;`;
  if (!source.includes(declarations)) {
    throw new Error(
      '[glint] failed to patch @volar/typescript proxyCreateProgram.js: ' +
        'single-slot cache declarations not found in expected shape. ' +
        'The volar dep may have changed; update patchProxyPerProjectCaches() in run-volar-tsc.ts.',
    );
  }
  source = source.replace(
    declarations,
    `    const projectCaches = new Map();
    let lastOptions;
    let languagePlugins;
    let language;
    let moduleResolutionCache;`,
  );

  // Swap the current project's cache slot in at the top of every
  // createProgram call, and persist it back after the cache-rebuild block.
  const applyEntry = `            const options = args[0];
            assert(!!options.host, '!!options.host');
            if (!lastOptions`;
  if (!source.includes(applyEntry)) {
    throw new Error(
      '[glint] failed to patch @volar/typescript proxyCreateProgram.js: ' +
        'createProgram apply entry not found in expected shape. ' +
        'The volar dep may have changed; update patchProxyPerProjectCaches() in run-volar-tsc.ts.',
    );
  }
  source = source.replace(
    applyEntry,
    `            const options = args[0];
            assert(!!options.host, '!!options.host');
            const projectCacheKey = String(options.options.configFilePath ?? '');
            const projectCache = projectCaches.get(projectCacheKey);
            if (projectCache) {
                ({ lastOptions, languagePlugins, language, moduleResolutionCache } = projectCache);
            }
            else {
                lastOptions = languagePlugins = language = moduleResolutionCache = undefined;
            }
            if (!lastOptions`,
  );

  // Persist the (possibly rebuilt) slot right after the rebuild block closes —
  // anchored on the \`const originalHost = options.host;\` line that follows it.
  const afterRebuild = `            const originalHost = options.host;`;
  if (!source.includes(afterRebuild)) {
    throw new Error(
      '[glint] failed to patch @volar/typescript proxyCreateProgram.js: ' +
        'originalHost anchor not found in expected shape. ' +
        'The volar dep may have changed; update patchProxyPerProjectCaches() in run-volar-tsc.ts.',
    );
  }
  source = source.replace(
    afterRebuild,
    `            projectCaches.set(projectCacheKey, { lastOptions, languagePlugins, language, moduleResolutionCache });
            const originalHost = options.host;`,
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
function patchTscJsExtensionForGts(source: string): string {
  const pattern = /function tryGetJSExtensionForFile\(([A-Za-z0-9_$]+),[^)]*\)\s*\{/;
  const match = pattern.exec(source);
  if (!match) {
    throw new Error(
      '[glint] failed to patch typescript `tryGetJSExtensionForFile`: ' +
        'function signature not found in expected shape. ' +
        'The typescript dep may have changed; update patchTscJsExtensionForGts() in run-volar-tsc.ts.',
    );
  }
  const fileNameParam = match[1];
  return source.replace(
    pattern,
    (m) => `${m}\n    if (/\\.g[jt]s$/.test(${fileNameParam})) return ".js";`,
  );
}

// `tsc -b --watch` reconstructs each project's Program from scratch on every
// file change: the solution builder unconditionally releases the built Program
// (`afterProgramDone` -> `releaseProgram()`) so `oldProgram` never reaches
// `createProgram`, and its compiler host (unlike plain `--watch`'s) has no
// SourceFile cache across iterations. For a 19,286-file project a one-line
// change cost 30s (Parse 7.3s + ResolveModule 7.2s + re-transform of every
// .gts); with these patches (plus the per-project proxy caches above) the same
// iteration costs ~2s — identical to plain `--watch`. Costs ~+1.4GB RSS from
// retaining programs between iterations.
//
// Three patches:
//  1. afterProgramDone: keep programs alive in watch mode so oldProgram-based
//     SourceFile/resolution reuse engages.
//  2. setGetSourceFileAsHashVersioned: version-validated SourceFile cache so
//     unchanged files skip re-parsing. Scoped per project (via the solution
//     builder's current configFilePath): with project references the same
//     physical file is a redirect in one program and a root in another, so
//     SourceFile objects must never be shared across projects. Object identity
//     also keeps volar's parsedSourceFiles WeakMap warm (no .gts re-transform).
//  3. tryAddRoot: with a partially reused program, source-of-project-reference
//     redirect files can lose their fileIncludeReasons keying (declaration
//     path vs mapped source path) and buildinfo emit crashed with
//     "Cannot read properties of undefined (reading 'some')". A file without
//     include reasons cannot be a RootFile, so skipping it is the correct
//     result (the affected files are other projects' declaration outputs).
//
// Tracking: https://github.com/typed-ember/glint/issues/1199 /
// upstream https://github.com/volarjs/volar.js/issues/314
function patchTscSolutionBuilderWatchReuse(source: string): string {
  const fail = (what: string): never => {
    throw new Error(
      `[glint] failed to patch typescript solution-builder watch reuse (${what}): ` +
        'source not found in expected shape. The typescript dep may have changed; ' +
        'update patchTscSolutionBuilderWatchReuse() in run-volar-tsc.ts.',
    );
  };

  // 1. Retain programs across watch iterations.
  const releaseSite = `    program.releaseProgram();
  }`;
  const releaseContext = `function afterProgramDone(state, program) {
  if (program) {
    if (state.host.afterProgramEmitAndDiagnostics) {
      state.host.afterProgramEmitAndDiagnostics(program);
    }
    program.releaseProgram();
  }`;
  if (!source.includes(releaseContext)) fail('afterProgramDone');
  source = source.replace(
    releaseContext,
    releaseContext.replace(releaseSite, `    if (!state.watch) program.releaseProgram();\n  }`),
  );

  // 2. Version-validated, per-project SourceFile cache on the shared
  //    solution-builder compiler host.
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
  if (!source.includes(hashVersioned)) fail('setGetSourceFileAsHashVersioned');
  source = source.replace(
    hashVersioned,
    `function setGetSourceFileAsHashVersioned(compilerHost, getCacheScope) {
  const originalGetSourceFile = compilerHost.getSourceFile;
  const sourceFileCaches = new Map();
  compilerHost.getSourceFile = (fileName, languageVersionOrOptions, onError, shouldCreateNewSourceFile) => {
    const scope = getCacheScope ? getCacheScope() : "";
    let sourceFileCache = sourceFileCaches.get(scope);
    if (!sourceFileCache) {
      sourceFileCache = new Map();
      sourceFileCaches.set(scope, sourceFileCache);
    }
    let text;
    try {
      text = compilerHost.readFile(fileName);
    } catch {
      text = undefined;
    }
    if (text !== undefined && !shouldCreateNewSourceFile) {
      const version = getSourceFileVersionAsHashFromText(compilerHost, text);
      const resolvedLanguageVersion = typeof languageVersionOrOptions === "object" ? languageVersionOrOptions.languageVersion : languageVersionOrOptions;
      const impliedNodeFormat = typeof languageVersionOrOptions === "object" ? languageVersionOrOptions.impliedNodeFormat : void 0;
      const cached = sourceFileCache.get(fileName);
      if (cached && cached.version === version && cached.languageVersion === resolvedLanguageVersion && cached.impliedNodeFormat === impliedNodeFormat) {
        return cached;
      }
      const result = originalGetSourceFile.call(compilerHost, fileName, languageVersionOrOptions, onError, shouldCreateNewSourceFile);
      if (result) {
        result.version = version;
        sourceFileCache.set(fileName, result);
      }
      return result;
    }
    const result = originalGetSourceFile.call(compilerHost, fileName, languageVersionOrOptions, onError, shouldCreateNewSourceFile);
    if (result) {
      result.version = getSourceFileVersionAsHashFromText(compilerHost, result.text);
      sourceFileCache.set(fileName, result);
    }
    return result;
  };
}`,
  );

  // ...and pass the project scope at the solution-builder call site (the only
  // call site followed by getParsedCommandLine wiring).
  const builderCallSite = `  setGetSourceFileAsHashVersioned(compilerHost);
  compilerHost.getParsedCommandLine =`;
  if (!source.includes(builderCallSite)) fail('solution builder host call site');
  source = source.replace(
    builderCallSite,
    `  setGetSourceFileAsHashVersioned(compilerHost, () => String(state.projectCompilerOptions.configFilePath ?? ""));
  compilerHost.getParsedCommandLine =`,
  );

  // 3. Tolerate missing include reasons for redirect files during buildinfo
  //    emit of a reused program.
  const tryAddRoot = `    const file = state.program.getSourceFile(path);
    if (!state.program.getFileIncludeReasons().get(file.path).some((r) => r.kind === 0 /* RootFile */)) return;`;
  if (!source.includes(tryAddRoot)) fail('tryAddRoot');
  source = source.replace(
    tryAddRoot,
    `    const file = state.program.getSourceFile(path);
    const reasons = state.program.getFileIncludeReasons().get(file.path);
    if (!reasons || !reasons.some((r) => r.kind === 0 /* RootFile */)) return;`,
  );

  return source;
}

// Volar's `runTsc` does not surface the content-tag parse errors that we attach
// to `TransformedModule.errors` when content-tag fails to parse a .gts/.gjs
// file. In that case the transformed source is the raw .gts/.gjs source and
// every mapping carries `verification: false` (see `rewriteModule` /
// `toVolarMappings`), so volar drops the flood of misleading TS errors against
// the still-unparsed `<template>` tags; the trade-off is that the underlying
// parse failure is silently dropped.
//
// In language-server / tsserver-plugin contexts that silence is fine because
// the parse error is re-surfaced by separate diagnostic providers. But the
// `ember-tsc` CLI runs `tsc` via volar's `runTsc` (the Program path), which has
// no such provider — so `ember-tsc --noEmit` would report no errors at all on
// a broken template tag.
//
// We bridge that gap here by hot-patching `decorateProgram` from
// `@volar/typescript`: every time volar decorates a freshly created Program,
// we wrap its diagnostic methods to also include the synthesized content-tag
// diagnostics for any `.gts`/`.gjs` source files involved.
function patchVolarDecorateProgramForContentTagErrors(): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
  const decorateModule = require('@volar/typescript/lib/node/decorateProgram.js') as {
    decorateProgram: (language: unknown, program: ts.Program) => void;
  };
  const originalDecorateProgram = decorateModule.decorateProgram;

  decorateModule.decorateProgram = (language, program) => {
    originalDecorateProgram(language, program);
    injectContentTagDiagnostics(language, program);
  };
}

function injectContentTagDiagnostics(language: unknown, program: ts.Program): void {
  // Loaded lazily so the runtime `ts` namespace is available without changing
  // the existing `import type ts` style at the top of the file.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const tsRuntime = require('typescript') as typeof ts;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lang = language as { scripts: { get(id: string): any } };

  // Cache of synthetic SourceFiles built from the original .gts/.gjs text,
  // keyed by file name. We use our own SourceFile here because the one TS
  // gives us via `program.getSourceFile` was built from the *transformed*
  // text, which is not guaranteed to match the original — so `--pretty`
  // rendering could print the wrong source line under the diagnostic header
  // (see https://github.com/typed-ember/glint/pull/1149#discussion_r... for
  // the bug report). The original text lives on volar's `sourceScript.snapshot`.
  const originalSourceFiles = new Map<string, ts.SourceFile>();

  const getOriginalSourceFile = (fileName: string): ts.SourceFile | undefined => {
    const cached = originalSourceFiles.get(fileName);
    if (cached) return cached;
    const sourceScript = lang.scripts.get(fileName);
    const snapshot = sourceScript?.snapshot as ts.IScriptSnapshot | undefined;
    if (!snapshot) return undefined;
    const text = snapshot.getText(0, snapshot.getLength());
    const sf = tsRuntime.createSourceFile(
      fileName,
      text,
      tsRuntime.ScriptTarget.Latest,
      /* setParentNodes */ false,
    );
    originalSourceFiles.set(fileName, sf);
    return sf;
  };

  // Returns the synthesized content-tag diagnostics for a given source file (or
  // for every .gts/.gjs source file in the program when `sourceFile` is
  // omitted). Diagnostic offsets are in original .gts/.gjs coordinates, which
  // already match the synthetic SourceFile we attach.
  const collectExtras = (sourceFile?: ts.SourceFile): ts.Diagnostic[] => {
    if (!sourceFile) {
      const extras: ts.Diagnostic[] = [];
      for (const sf of program.getSourceFiles()) {
        extras.push(...collectExtras(sf));
      }
      return extras;
    }
    const sourceScript = lang.scripts.get(sourceFile.fileName);
    const root = sourceScript?.generated?.root;
    if (!(root instanceof VirtualGtsCode)) {
      return [];
    }
    const transformedModule = root.transformedModule;
    if (!transformedModule) {
      return [];
    }
    // Render against the original .gts/.gjs text (not the SourceFile TS
    // hands back, which holds the transformed contents) so `tsc --pretty`
    // prints the actual offending source line.
    const originalSourceFile = getOriginalSourceFile(sourceFile.fileName) ?? sourceFile;
    return getTransformErrorDiagnostics(transformedModule, originalSourceFile);
  };

  const wrapPerFileDiagnostics = <K extends 'getSyntacticDiagnostics' | 'getSemanticDiagnostics'>(
    key: K,
  ): void => {
    // `getBindAndCheckDiagnostics` is the watch-mode counterpart and is also
    // wrapped below via the same helper through a cast.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const original = (program as any)[key];
    if (typeof original !== 'function') {
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (program as any)[key] = (
      sourceFile?: ts.SourceFile,
      cancellationToken?: ts.CancellationToken,
    ): readonly ts.Diagnostic[] => {
      const original$ = original.call(
        program,
        sourceFile,
        cancellationToken,
      ) as readonly ts.Diagnostic[];
      const extras = collectExtras(sourceFile);
      return extras.length ? [...original$, ...extras] : original$;
    };
  };

  wrapPerFileDiagnostics('getSyntacticDiagnostics');
  wrapPerFileDiagnostics('getSemanticDiagnostics');
  // `getBindAndCheckDiagnostics` is used by `tsc --noEmit --watch`; it has the
  // same signature as the methods above but is not part of the public types.
  wrapPerFileDiagnostics('getBindAndCheckDiagnostics' as unknown as 'getSyntacticDiagnostics');

  const originalEmit = program.emit;
  program.emit = (...args) => {
    const result = originalEmit.apply(program, args);
    const extras = collectExtras();
    return extras.length ? { ...result, diagnostics: [...result.diagnostics, ...extras] } : result;
  };
}
