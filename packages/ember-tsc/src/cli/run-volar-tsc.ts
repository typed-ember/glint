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
  patchVolarProxyForExtensionlessImports();
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
function patchVolarProxyForExtensionlessImports(): void {
  const originalReadFileSync = fs.readFileSync;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (fs as any).readFileSync = function (...args: unknown[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (originalReadFileSync as any).apply(fs, args);
    const filePath = args[0];
    if (typeof filePath === 'string' && filePath.endsWith('/proxyCreateProgram.js')) {
      const text = typeof result === 'string' ? result : (result as Buffer).toString('utf8');
      const patched = applyProxyPatches(text);
      return typeof result === 'string' ? patched : Buffer.from(patched);
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

  return source.replace(literalsPattern, `$1${guard}$2`).replace(namesPattern, `$1${guard}$2`);
}

// Volar's `runTsc` does not surface the content-tag parse errors that we attach
// to `TransformedModule.errors` when content-tag fails to parse a .gts/.gjs
// file. The transformed source is intentionally blanked to whitespace in that
// case (see `rewriteModule`) so TypeScript does not emit a flood of misleading
// errors against the still-unparsed `<template>` tags; the trade-off is that
// the underlying parse failure is silently dropped.
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lang = language as { scripts: { get(id: string): any } };

  // Returns the synthesized content-tag diagnostics for a given source file (or
  // for every .gts/.gjs source file in the program when `sourceFile` is
  // omitted). Diagnostic offsets are in original .gts/.gjs coordinates, which
  // already match the source file TypeScript hands back via `program.getSourceFile`.
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
    return getTransformErrorDiagnostics(transformedModule, sourceFile);
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
