import type * as ts from 'typescript';
import TransformedModule from '../template/transformed-module.js';
import { Diagnostic } from './index.js';

/**
 * Synthesize TypeScript diagnostics for the transform errors recorded on a
 * `TransformedModule` so that consumers of the tsserver-plugin and `ember-tsc`
 * CLI paths see the underlying error rather than nothing. Two kinds of error
 * land here:
 *
 * - content-tag parse failures (`isContentTagError`). When content-tag cannot
 *   parse a .gts/.gjs file we suppress the resulting flood of TS errors by
 *   disabling `verification` on every mapping (see `rewriteModule` /
 *   `toVolarMappings`), which leaves those paths silent on their own.
 *
 * - handlebars parse failures inside an individual `<template>`. The template
 *   contributes no transformed output, so TypeScript has nothing to report
 *   for it and the rest of the template goes unchecked; the only trace of the
 *   failure is the error recorded here (typed-ember/glint#1221).
 *
 * The Volar language server surfaces both through its `g-compiler-errors`
 * plugin, so VS Code sees them regardless; this function covers every other
 * consumer.
 *
 * Offsets are in original (.gts) source coordinates; tsserver maps them to
 * line/column using its own ScriptInfo for the source file, so the same
 * value works regardless of what the transformed output contains.
 */
export function getTransformErrorDiagnostics(
  transformedModule: TransformedModule,
  sourceFile: ts.SourceFile,
): Diagnostic[] {
  return transformedModule.errors.map((error) => ({
    file: sourceFile,
    start: error.location.start,
    length: Math.max(1, error.location.end - error.location.start),
    messageText: error.message,
    // ts.DiagnosticCategory.Error — hardcoded to avoid importing the ts
    // namespace just for the enum.
    category: 1,
    // Matches the code used by the Volar language server's compiler-errors
    // plugin, so the two surfaces present a consistent identity.
    code: 0,
    source: 'glint',
    isContentTagError: error.isContentTagError,
  }));
}
