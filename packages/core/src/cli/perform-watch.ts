import TransformManager from '../common/transform-manager';
import { GlintConfig } from '@glint/config';
import { buildDiagnosticFormatter } from './diagnostics';
import type ts from 'typescript';
import { sysForWatchCompilerHost } from './utils/sys-for-watch';

export type TypeScript = typeof ts;

export function performWatch(
  glintConfig: GlintConfig,
  optionsToExtend: ts.CompilerOptions
): void {
  let { ts } = glintConfig;
  let transformManager = new TransformManager(glintConfig);
  let formatDiagnostic = buildDiagnosticFormatter(ts);
  let host = ts.createWatchCompilerHost(
    glintConfig.configPath,
    optionsToExtend,
    sysForWatchCompilerHost(ts, transformManager),
    ts.createSemanticDiagnosticsBuilderProgram,
    (diagnostic) => console.error(formatDiagnostic(diagnostic))
  );

  patchWatchCompilerHost(host, transformManager);

  ts.createWatchProgram(host);
}

type Program = ts.SemanticDiagnosticsBuilderProgram;
type WatchCompilerHost = ts.WatchCompilerHostOfConfigFile<Program>;

function patchWatchCompilerHost(host: WatchCompilerHost, transformManager: TransformManager): void {
  let { afterProgramCreate } = host;
  host.afterProgramCreate = (program) => {
    patchProgram(program, transformManager);
    afterProgramCreate?.call(host, program);
  };
}

function patchProgram(program: Program, transformManager: TransformManager): void {
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
