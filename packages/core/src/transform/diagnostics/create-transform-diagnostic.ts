import { createSyntheticSourceFile, TSLib } from '../util.js';
import { SourceFile, Range } from '../template/transformed-module.js';
import type { Diagnostic } from './index.js';

export function createTransformDiagnostic(
  ts: TSLib,
  source: SourceFile,
  message: string,
  location: Range
): Diagnostic {
  return {
    isGlintTransformDiagnostic: true,
    category: ts.DiagnosticCategory.Error,
    code: 0,
    file: createSyntheticSourceFile(ts, source),
    start: location.start,
    length: location.end - location.start,
    messageText: message,
  };
}
