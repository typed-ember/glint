import type * as ts from 'typescript';
import TransformedModule from '../template/transformed-module.js';
import { Diagnostic } from './index.js';

/**
 * Synthesize TypeScript diagnostics for any unrecoverable transform errors
 * (currently: content-tag parse failures) so that consumers of the
 * tsserver-plugin path see the underlying error rather than nothing.
 *
 * Without this, when content-tag fails to parse a .gts/.gjs file we suppress
 * the resulting flood of TS errors by blanking the transformed contents (see
 * `rewriteModule`). That leaves the tsserver path silent on its own — fine
 * inside VS Code, where the Volar language server's `g-compiler-errors`
 * plugin surfaces the error, but unhelpful for any consumer running only
 * the tsserver plugin.
 *
 * Offsets are in original (.gts) source coordinates; tsserver maps them to
 * line/column using its own ScriptInfo for the source file, so the same
 * value works regardless of how we blanked the transformed output.
 */
export function getTransformErrorDiagnostics(
  transformedModule: TransformedModule,
  sourceFile: ts.SourceFile,
): Diagnostic[] {
  return transformedModule.errors
    .filter((error) => error.isContentTagError)
    .map((error) => ({
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
      isContentTagError: true,
    }));
}
