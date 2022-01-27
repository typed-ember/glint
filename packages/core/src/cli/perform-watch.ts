import TransformManager from '../common/transform-manager';
import { GlintConfig } from '@glint/config';
import { buildDiagnosticFormatter } from './diagnostics';

export function performWatch(
  ts: typeof import('typescript'),
  glintConfig: GlintConfig,
  tsconfigPath: string | undefined,
  optionsToExtend: import('typescript').CompilerOptions
): void {
  let transformManager = new TransformManager(ts, glintConfig);
  let formatDiagnostic = buildDiagnosticFormatter(ts);
  let host = ts.createWatchCompilerHost(
    tsconfigPath ?? 'tsconfig.json',
    optionsToExtend,
    sysForWatchCompilerHost(ts, transformManager),
    ts.createSemanticDiagnosticsBuilderProgram,
    (diagnostic) => console.error(formatDiagnostic(diagnostic))
  );

  patchWatchCompilerHost(host, transformManager);

  ts.createWatchProgram(host);
}

function sysForWatchCompilerHost(
  ts: typeof import('typescript'),
  transformManager: TransformManager
): typeof ts.sys {
  return {
    ...ts.sys,
    readDirectory: transformManager.readDirectory,
    watchDirectory: transformManager.watchDirectory,
    fileExists: transformManager.fileExists,
    watchFile: transformManager.watchTransformedFile,
    readFile: transformManager.readTransformedFile,
  };
}

type Program = import('typescript').SemanticDiagnosticsBuilderProgram;
type WatchCompilerHost = import('typescript').WatchCompilerHostOfConfigFile<Program>;

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
