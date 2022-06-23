import type ts from 'typescript';
import TransformManager from '../common/transform-manager';
import { GlintConfig } from '@glint/config';
import { buildDiagnosticFormatter } from './diagnostics';

type TypeScript = typeof ts;

export function performCheck(glintConfig: GlintConfig, optionsToExtend: ts.CompilerOptions): void {
  let { ts } = glintConfig;
  let transformManager = new TransformManager(glintConfig);
  let parsedConfig = loadTsconfig(ts, transformManager, glintConfig.configPath, optionsToExtend);
  let compilerHost = createCompilerHost(ts, parsedConfig.options, transformManager);
  let formatDiagnostic = buildDiagnosticFormatter(ts);
  let program = ts.createProgram({
    rootNames: parsedConfig.fileNames,
    options: parsedConfig.options,
    host: compilerHost,
  });

  program.emit();

  let baselineDiagnostics = collectDiagnostics(program, transformManager, parsedConfig.options);
  let fullDiagnostics = transformManager.rewriteDiagnostics(baselineDiagnostics);
  for (let diagnostic of fullDiagnostics) {
    console.error(formatDiagnostic(diagnostic));
  }

  process.exit(fullDiagnostics.length ? 1 : 0);
}

function collectDiagnostics(
  program: ts.Program,
  transformManager: TransformManager,
  options: ts.CompilerOptions
): Array<ts.Diagnostic> {
  return [
    ...program.getSyntacticDiagnostics(),
    ...transformManager.getTransformDiagnostics(),
    ...program.getSemanticDiagnostics(),
    ...(options.declaration ? program.getDeclarationDiagnostics() : []),
  ];
}

function createCompilerHost(
  ts: TypeScript,
  options: ts.CompilerOptions,
  transformManager: TransformManager
): ts.CompilerHost {
  let host = ts.createCompilerHost(options);
  host.fileExists = transformManager.fileExists;
  host.readFile = transformManager.readTransformedFile;
  host.readDirectory = transformManager.readDirectory;
  return host;
}

function loadTsconfig(
  ts: TypeScript,
  transformManager: TransformManager,
  configPath: string | undefined,
  optionsToExtend: ts.CompilerOptions
): ts.ParsedCommandLine {
  if (!configPath) {
    return {
      fileNames: [],
      options: optionsToExtend,
      errors: [],
    };
  }

  let config = ts.getParsedCommandLineOfConfigFile(configPath, optionsToExtend, {
    ...ts.sys,
    readDirectory: transformManager.readDirectory,
    onUnRecoverableConfigFileDiagnostic(diagnostic) {
      let { messageText } = diagnostic;
      if (typeof messageText !== 'string') {
        messageText = messageText.messageText;
      }

      throw new Error(messageText);
    },
  });

  if (!config) {
    throw new Error('Unknown error loading config');
  }

  return config;
}
