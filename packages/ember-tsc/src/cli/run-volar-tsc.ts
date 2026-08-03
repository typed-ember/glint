import { runTsc } from '@volar/typescript/lib/quickstart/runTsc.js';
import type ts from 'typescript';
import { createEmberLanguagePlugin } from '../volar/ember-language-plugin.js';
import { findConfig } from '../config/index.js';
import { VirtualGtsCode } from '../volar/gts-virtual-code.js';
import { getTransformErrorDiagnostics } from '../transform/diagnostics/transform-errors.js';
import {
  applyProxyPatches,
  patchTscJsExtensionForGts,
  patchTscSolutionBuilderWatchReuse,
} from './tsc-source-patches.js';

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

// Intercepts the compiled sources of `typescript` and `@volar/typescript` on
// their way off disk and rewrites them before Node compiles them. The patches
// themselves — and the rationale for each — live in `tsc-source-patches.ts`.
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

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { transformDiagnostic } = require('@volar/typescript/lib/node/transform.js') as {
    transformDiagnostic: (
      language: unknown,
      diagnostic: ts.Diagnostic,
      program: ts.Program | undefined,
      isTsc: boolean,
    ) => ts.Diagnostic | undefined;
  };

  const originalEmit = program.emit;
  program.emit = (...args) => {
    // TypeScript's incremental builder computes a changed file's "shape
    // signature" by declaration-emitting just that file through
    // `program.emit(sourceFile, writeFile, ct, EmitOnly.BuilderSignature, ...,
    // forceDtsEmit)` and hashing the result — including every declaration
    // diagnostic's `(start,length)` (see `computeSignatureWithDiagnostics`).
    // For a .ts file those offsets are source positions, so the signature only
    // changes when something before the diagnostic moves. For .gts/.gjs they
    // are *transformed-file* positions, and volar's transformed text begins
    // with a whitespace pad exactly as long as the original file — so every
    // offset shifts whenever the file's length changes at all. A .gts with any
    // declaration-emit diagnostic (TS2742, TS4094, ... — invisible under
    // `--noEmit`) therefore gets a new signature on every length-changing
    // edit, and tsc re-checks its entire transitive importer closure every
    // time. Restore parity with .ts by mapping the diagnostics back to
    // original source coordinates before they are hashed. (Diagnostics that
    // exist only in generated code have no source position and are dropped.)
    const emitOnly = args[3] as boolean | number | undefined;
    if (emitOnly === 2 /* ts.EmitOnly.BuilderSignature (internal) */) {
      const [sourceFile, writeFile] = args;
      if (
        sourceFile &&
        writeFile &&
        lang.scripts.get(sourceFile.fileName)?.generated?.root instanceof VirtualGtsCode
      ) {
        const wrappedArgs = [...args] as typeof args;
        wrappedArgs[1] = (fileName, text, writeByteOrderMark, onError, sourceFiles, data) => {
          // `diagnostics` is not part of the public WriteFileCallbackData type.
          const dataWithDiagnostics = data as
            | (ts.WriteFileCallbackData & { diagnostics?: readonly ts.Diagnostic[] })
            | undefined;
          if (dataWithDiagnostics?.diagnostics?.length) {
            const diagnostics = dataWithDiagnostics.diagnostics
              .map((diagnostic) => transformDiagnostic(language, diagnostic, program, true))
              .filter((diagnostic) => !!diagnostic);
            data = { ...dataWithDiagnostics, diagnostics } as ts.WriteFileCallbackData;
          }
          writeFile(fileName, text, writeByteOrderMark, onError, sourceFiles, data);
        };
        return originalEmit.apply(program, wrappedArgs);
      }
      // Signature emits never surface user-facing diagnostics, so skip the
      // content-tag extras: `collectExtras()` walks every source file in the
      // program, which is pure overhead once per signature computation.
      return originalEmit.apply(program, args);
    }
    const result = originalEmit.apply(program, args);
    const extras = collectExtras();
    return extras.length ? { ...result, diagnostics: [...result.diagnostics, ...extras] } : result;
  };
}
