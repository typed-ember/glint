import { describe, expect, test } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import {
  applyProxyPatches,
  patchTscJsExtensionForGts,
  patchTscSolutionBuilderWatchReuse,
  replaceExactlyOnce,
} from '@glint/ember-tsc/cli/tsc-source-patches';

// `ember-tsc` rewrites the compiled sources of `typescript` and
// `@volar/typescript` as they are read off disk. Those patches match verbatim
// slices of somebody else's build output, so the thing most likely to break them
// is a dependency upgrade — and the failure mode we care about is the quiet one,
// where a patch stops applying (or applies to the wrong call site) and the only
// symptom is that `--build --watch` gets slow again.
//
// These tests run the real patch functions against the real installed
// dependency sources, so a dep bump that invalidates an anchor fails here
// instead of at a user's terminal.
// See https://github.com/typed-ember/glint/issues/1199.

const require = createRequire(import.meta.url);

// Resolve volar from `@glint/ember-tsc`'s dependency tree — it isn't a direct
// dependency of this test package.
const emberTscRequire = createRequire(require.resolve('@glint/ember-tsc'));

const VOLAR_PROXY_PATH = emberTscRequire.resolve(
  '@volar/typescript/lib/node/proxyCreateProgram.js',
);

// `typescript/lib/tsc.js` is a small shim that defers to `_tsc.js`; the compiled
// compiler (and every anchor we patch) lives in the latter. Mirror how
// `patchCompilerSourcesForGts` picks its target: the lib file that actually
// contains `tryGetJSExtensionForFile`.
const TSC_PATH = resolve(dirname(require.resolve('typescript/lib/tsc')), '_tsc.js');

const volarSource = readFileSync(VOLAR_PROXY_PATH, 'utf8');
const tscSource = readFileSync(TSC_PATH, 'utf8');

/** Throws if `source` is not syntactically valid JS. */
function expectParses(source: string, label: string): void {
  expect(() => new Function(source), `${label} should still parse after patching`).not.toThrow();
}

describe('replaceExactlyOnce', () => {
  test('replaces a unique occurrence', () => {
    expect(replaceExactlyOnce('a b c', 'b', 'X', 'dep', 'anchor')).toBe('a X c');
  });

  test('throws when the anchor is missing', () => {
    expect(() => replaceExactlyOnce('a b c', 'zzz', 'X', 'dep', 'anchor')).toThrow(
      /failed to patch dep \(anchor\).*not found in expected shape/s,
    );
  });

  // The patches previously used `String.replace`, which silently rewrites only
  // the first match. An anchor that becomes ambiguous must fail loudly rather
  // than patch an arbitrary call site.
  test('throws when the anchor is ambiguous', () => {
    expect(() => replaceExactlyOnce('a b c b', 'b', 'X', 'dep', 'anchor')).toThrow(
      /expected exactly one occurrence but found several/,
    );
  });

  test('points at the file to update', () => {
    expect(() => replaceExactlyOnce('a', 'zzz', 'X', 'dep', 'anchor')).toThrow(
      /update tsc-source-patches\.ts/,
    );
  });
});

describe('@volar/typescript proxyCreateProgram patches', () => {
  const patched = applyProxyPatches(volarSource);

  test('applies against the installed volar version', () => {
    expect(patched).not.toBe(volarSource);
    expectParses(patched, 'proxyCreateProgram.js');
  });

  test('disables the module-resolution fast path for hidden extensions', () => {
    expect(patched).toContain('!languagePlugins.some(p => p.typescript?.resolveHiddenExtensions)');
  });

  test('keys volar caches per project', () => {
    expect(patched).toContain('const projectCaches = new Map()');
    expect(patched).toContain("String(options.options.configFilePath ?? '')");
    // The single-slot cache the upstream source uses must be gone.
    expect(volarSource).toContain('let moduleResolutionCache;');
    expect(patched).not.toMatch(
      /const sourceFileSnapshots = new language_core_1\.FileMap\(ts\.sys\.useCaseSensitiveFileNames\);\n {4}const parsedSourceFiles/,
    );
  });

  // The per-project entries hold a whole volar `language` (every .gts's virtual
  // code) plus the snapshots that reference SourceFiles. They must not outlive
  // the Program they belong to, or a long watch session grows without bound.
  test('holds per-project state weakly', () => {
    expect(patched).toContain('languageRef: new WeakRef(language)');
    expect(patched).toContain('projectCacheEntry.languageRef.deref()');
    expect(patched).toContain('new FinalizationRegistry');
  });

  test('scopes sourceFileSnapshots per project so it cannot pin SourceFiles', () => {
    expect(patched).toContain('sourceFileSnapshots = projectCacheEntry.sourceFileSnapshots');
    expect(patched).toContain('let sourceFileSnapshots =');
  });

  test('fails loudly when an anchor no longer matches', () => {
    const upgraded = volarSource.replace('let moduleResolutionCache;', 'let mrc;');
    expect(() => applyProxyPatches(upgraded)).toThrow(/failed to patch @volar\/typescript/);
  });
});

describe('typescript solution-builder watch-reuse patches', () => {
  const patched = patchTscSolutionBuilderWatchReuse(patchTscJsExtensionForGts(tscSource));

  test('applies against the installed typescript version', () => {
    expect(patched).not.toBe(tscSource);
    expectParses(patched, '_tsc.js');
  });

  test('teaches tryGetJSExtensionForFile about .gts/.gjs', () => {
    expect(patched).toMatch(/if \(\/\\\.g\[jt\]s\$\/\.test\(\w+\)\) return "\.js";/);
  });

  test('retains programs in watch mode only', () => {
    expect(patched).toContain('if (!state.watch) program.releaseProgram();');
    // The unconditional release must be gone from afterProgramDone.
    expect(patched).not.toContain(`    }
    program.releaseProgram();
  }`);
  });

  test('gives the solution-builder host a project-scoped SourceFile cache', () => {
    expect(patched).toContain(
      'setGetSourceFileAsHashVersioned(compilerHost, () => String(state.projectCompilerOptions.configFilePath ?? ""))',
    );
    expect(patched).toContain(
      'function setGetSourceFileAsHashVersioned(compilerHost, getCacheScope)',
    );
  });

  // Regression guard for the subtlest part of these patches: the *function body*
  // is rewritten, but it has three call sites. Only the solution builder can
  // name the project being built; plain `--watch` and `createIncrementalCompilerHost`
  // have no safe key to cache under (and keep their own SourceFile caches), so
  // they must keep stock behavior rather than share one process-wide cache.
  test('leaves the other two call sites unscoped, i.e. on stock behavior', () => {
    expect(patched).toContain('if (!getCacheScope) {');
    expect(patched).toContain('compilerHost.getSourceFile = stockGetSourceFile;');

    // createIncrementalCompilerHost
    expect(patched).toContain('setGetSourceFileAsHashVersioned(host);');
    // createWatchProgram
    expect(patched).toContain(`setGetSourceFileAsHashVersioned(compilerHost);
  const getNewSourceFile = compilerHost.getSourceFile;`);

    // Exactly one of the three call sites passes a scope. (`\(\)` keeps this
    // from also counting the rewritten function declaration.)
    const scopedCallSites = patched.match(
      /setGetSourceFileAsHashVersioned\(compilerHost, \(\) =>/g,
    );
    expect(scopedCallSites).toHaveLength(1);
  });

  test('caches SourceFiles weakly', () => {
    expect(patched).toContain('const ref = new WeakRef(result);');
    expect(patched).toContain('cachedRef && cachedRef.deref()');
  });

  // `root` is persisted into .tsbuildinfo. Dropping a genuine root would let a
  // later build consider the project up to date when it isn't, so the tolerant
  // branch must be limited to files that are demonstrably not roots.
  test('tolerates missing include reasons only for non-root files', () => {
    expect(patched).toContain('const reasons = file && state.program.getFileIncludeReasons()');
    expect(patched).toContain('rootFileNames.has(path) || rootFileNames.has(file.path)');
    expect(patched).toMatch(/throw new Error\("\[glint\] buildinfo emit: no file include reasons/);
  });

  test('fails loudly when an anchor no longer matches', () => {
    const upgraded = tscSource.replace(
      'function afterProgramDone(state, program) {',
      'function afterProgramDone2(state, program) {',
    );
    expect(() => patchTscSolutionBuilderWatchReuse(upgraded)).toThrow(
      /failed to patch typescript solution-builder watch reuse \(afterProgramDone\)/,
    );
  });

  // The tryAddRoot guard reads `rootFileNames` from its enclosing scope. If that
  // binding ever moves, the patch would still apply and then throw a
  // ReferenceError during buildinfo emit, so it has to be asserted up front.
  test('fails loudly when the rootFileNames binding moves', () => {
    const upgraded = tscSource.replace(
      'const rootFileNames = new Set(state.program.getRootFileNames()',
      'const rootFiles = new Set(state.program.getRootFileNames()',
    );
    expect(() => patchTscSolutionBuilderWatchReuse(upgraded)).toThrow(
      /failed to patch typescript solution-builder watch reuse \(rootFileNames binding\)/,
    );
  });

  test('fails loudly when tryGetJSExtensionForFile changes shape', () => {
    const upgraded = tscSource.replace('function tryGetJSExtensionForFile(', 'function getJsExt(');
    expect(() => patchTscJsExtensionForGts(upgraded)).toThrow(
      /failed to patch typescript `tryGetJSExtensionForFile`/,
    );
  });
});
