import type TS from 'typescript';
import TransformManager from '../../common/transform-manager';

type Program = TS.SemanticDiagnosticsBuilderProgram;

export function patchProgram(program: Program, transformManager: TransformManager): void {
  let { getSyntacticDiagnostics, getSemanticDiagnostics } = program;

  program.getSyntacticDiagnostics = function (sourceFile, cancelationToken) {
    let diagnostics = getSyntacticDiagnostics.call(program, sourceFile, cancelationToken);
    let transformDiagnostics = transformManager.getTransformDiagnostics(sourceFile?.fileName);
    return [...diagnostics, ...transformDiagnostics];
  };

  program.getSemanticDiagnostics = (sourceFile, cancellationToken) => {
    let diagnostics = getSemanticDiagnostics.call(program, sourceFile, cancellationToken);
    return transformManager.rewriteDiagnostics(diagnostics, sourceFile?.fileName);
  };
}
