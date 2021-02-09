import type ts from 'typescript';
import TransformManager from '../common/transform-manager';
import { GlintConfig } from '@glint/config';

export function performCheck(
  ts: typeof import('typescript'),
  rootNames: string[],
  glintConfig: GlintConfig,
  configPath: string | undefined,
  optionsToExtend: ts.CompilerOptions
): void {
  let transformManager = new TransformManager(ts, glintConfig);
  let parsedConfig = loadTsconfig(ts, configPath, optionsToExtend);
  let compilerHost = createCompilerHost(ts, parsedConfig.options, transformManager);
  let program = ts.createProgram({
    rootNames: rootNames.length ? rootNames : parsedConfig.fileNames,
    options: parsedConfig.options,
    host: compilerHost,
  });

  program.emit();

  let diagnostics = collectDiagnostics(program, transformManager);
  for (let diagnostic of diagnostics) {
    console.error(transformManager.formatDiagnostic(diagnostic));
  }

  process.exit(diagnostics.length ? 1 : 0);
}

function collectDiagnostics(
  program: ts.Program,
  transformManager: TransformManager
): Array<ts.Diagnostic> {
  return [
    ...program.getSyntacticDiagnostics(),
    ...transformManager.getTransformDiagnostics(),
    ...program.getSemanticDiagnostics(),
    ...program.getDeclarationDiagnostics(),
  ];
}

function createCompilerHost(
  ts: typeof import('typescript'),
  options: ts.CompilerOptions,
  transformManager: TransformManager
): ts.CompilerHost {
  let host = ts.createCompilerHost(options);
  host.readFile = transformManager.readTransformedFile;
  return host;
}

function loadTsconfig(
  ts: typeof import('typescript'),
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
