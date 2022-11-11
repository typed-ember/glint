import { assert, createSyntheticSourceFile, TSLib } from '../util.js';
import TransformedModule from '../template/transformed-module.js';
import type { Diagnostic } from './index.js';
import { augmentDiagnostic } from './augmentation.js';

/**
 * Given a TypeScript diagnostic object from a module that was rewritten
 * by `rewriteModule`, as well as the resulting `TransformedModule`, returns
 * a rewritten version of that diagnostic that maps to the corresponding
 * location in the original source file.
 */
export function rewriteDiagnostic<T extends Diagnostic>(
  ts: TSLib,
  transformedDiagnostic: T,
  locateTransformedModule: (fileName: string) => TransformedModule | null | undefined
): T {
  assert(transformedDiagnostic.file);
  assert(transformedDiagnostic.start);
  assert(transformedDiagnostic.length);

  let transformedModule = locateTransformedModule(transformedDiagnostic.file.fileName);
  if (!transformedModule) {
    return transformedDiagnostic;
  }

  let { start, end, mapping, source } = transformedModule.getOriginalRange(
    transformedDiagnostic.start,
    transformedDiagnostic.start + transformedDiagnostic.length
  );

  let length = end - start;
  let diagnostic: T = {
    ...transformedDiagnostic,
    start,
    length,
    file: createSyntheticSourceFile(ts, source),
    relatedInformation: transformedDiagnostic.relatedInformation?.map((relatedInfo) =>
      rewriteDiagnostic(ts, relatedInfo, locateTransformedModule)
    ),
  };

  if (mapping) {
    diagnostic = augmentDiagnostic(diagnostic, mapping);
  }

  return diagnostic;
}
