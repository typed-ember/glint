import type ts from 'typescript';
import { assert, createSyntheticSourceFile, TSLib } from '../util';
import TransformedModule from '../template/transformed-module';
import MappingTree from '../template/mapping-tree';
import { MappingSource } from '../template/map-template-contents';
import type { Diagnostic } from '.';

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
  };

  if (hasRelatedInformation(diagnostic) && diagnostic.relatedInformation) {
    diagnostic.relatedInformation = diagnostic.relatedInformation.map((relatedInfo) =>
      rewriteDiagnostic(ts, relatedInfo, locateTransformedModule)
    );
  }

  return diagnostic;
}

function hasRelatedInformation(
  value: ts.DiagnosticWithLocation | ts.DiagnosticRelatedInformation
): value is ts.DiagnosticWithLocation {
  return 'relatedInformation' in value && Boolean(value.relatedInformation);
}

