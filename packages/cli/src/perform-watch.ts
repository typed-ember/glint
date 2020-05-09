import TransformManager from './transform-manager';

export function performWatch(
  ts: typeof import('typescript'),
  configPath: string | undefined,
  optionsToExtend: import('typescript').CompilerOptions
): void {
  let transformManager = new TransformManager(ts);
  let host = ts.createWatchCompilerHost(
    configPath ?? 'tsconfig.json',
    optionsToExtend,
    sysForWatchCompilerHost(ts, transformManager),
    ts.createSemanticDiagnosticsBuilderProgram,
    (diagnostic) => console.error(transformManager.formatDiagnostic(diagnostic))
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
    readFile(path, encoding) {
      return transformManager.readFile(path, encoding);
    },
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
  let { getSyntacticDiagnostics } = program;
  program.getSyntacticDiagnostics = function (sourceFile, cancelationToken) {
    let diagnostics = getSyntacticDiagnostics.call(program, sourceFile, cancelationToken);
    let transformDiagnostics = transformManager.getTransformDiagnostics(sourceFile);
    return [...diagnostics, ...transformDiagnostics];
  };
}
