import type * as TS from 'typescript';
import type TransformManager from '../../common/transform-manager.js';
import { assert } from './assert.js';
import type TransformManagerPool from './transform-manager-pool.js';

type Program = TS.SemanticDiagnosticsBuilderProgram;

export function patchProgram(
  program: Program,
  transformManagerOrPool: TransformManagerPool | TransformManager
): void {
  let { getSyntacticDiagnostics, getSemanticDiagnostics } = program;

  // We have two scenarios: either we are working with a single program for a
  // single project, in which case we have a `TransformManager`, *or* we have a
  // `TransformManagerPool` to deal with the case where we are running a
  // `--build` across a composite project. In the latter case, we need to *get*
  // a manager for the project in question, if it exists at all, to use in
  // getting transform errors (both type errors and syntax errors).
  let manager: TransformManager | null;
  if (isPool(transformManagerOrPool)) {
    let configFile = program.getCompilerOptions()['configFilePath'];
    assert(typeof configFile === 'string', 'internal error: missing TS config file');
    manager = transformManagerOrPool.managerForFile(configFile);
  } else {
    manager = transformManagerOrPool;
  }

  program.getSyntacticDiagnostics = function (sourceFile, cancelationToken) {
    let diagnostics = getSyntacticDiagnostics.call(program, sourceFile, cancelationToken);
    let transformDiagnostics = manager?.getTransformDiagnostics(sourceFile?.fileName) ?? [];
    return [...diagnostics, ...transformDiagnostics];
  };

  program.getSemanticDiagnostics = (sourceFile, cancellationToken) => {
    let diagnostics = getSemanticDiagnostics.call(program, sourceFile, cancellationToken);
    let rewrittenDiagnostics =
      manager?.rewriteDiagnostics(diagnostics, sourceFile?.fileName) ?? diagnostics;
    return rewrittenDiagnostics;
  };
}

function isPool(manager: TransformManager | TransformManagerPool): manager is TransformManagerPool {
  return !!(manager as TransformManagerPool).isPool;
}
