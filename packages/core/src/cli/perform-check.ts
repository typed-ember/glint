import type TS from 'typescript';
import TransformManager from '../common/transform-manager.js';
import { GlintConfig } from '../config/index.js';
import { buildDiagnosticFormatter } from './diagnostics.js';
import { sysForCompilerHost } from './utils/sys-for-compiler-host.js';

type TypeScript = typeof TS;

export function performCheck(glintConfig: GlintConfig, optionsToExtend: TS.CompilerOptions): void {
  let { ts } = glintConfig;
  let transformManager = new TransformManager(glintConfig);
  let parsedConfig = loadTsconfig(ts, transformManager, glintConfig.configPath, optionsToExtend);
  let compilerHost = createCompilerHost(ts, parsedConfig.options, transformManager);
  let formatDiagnostic = buildDiagnosticFormatter(ts);

  let createProgram = parsedConfig.options.incremental
    ? ts.createIncrementalProgram
    : ts.createProgram;

  let program = createProgram({
    rootNames: parsedConfig.fileNames,
    options: parsedConfig.options,
    host: compilerHost,
  });

  // We run *before* doing emit, so that if we are in an `--incremental` program
  // TS caches the diagnostics in the `tsbuildinfo` file it generates. This is
  // quirky, but it's how TS itself works internally, and it's also *sort of*
  // documented [here][wiki-pr].
  //
  // [wiki-pr]: https://github.com/microsoft/TypeScript-wiki/blob/ad7afb1b7049be5ac59ba55dce9a647390ee8481/Using-the-Compiler-API.md#a-minimal-incremental-compiler
  let baselineDiagnostics = collectDiagnostics(program, transformManager, parsedConfig.options);
  let emitResult = program.emit();
  let diagnosticsWithEmit = baselineDiagnostics.concat(emitResult.diagnostics);

  let fullDiagnostics = transformManager.rewriteDiagnostics(diagnosticsWithEmit);
  for (let diagnostic of fullDiagnostics) {
    console.error(formatDiagnostic(diagnostic));
  }

  process.exit(fullDiagnostics.length ? 1 : 0);
}

function collectDiagnostics(
  program: TS.Program | TS.EmitAndSemanticDiagnosticsBuilderProgram,
  transformManager: TransformManager,
  options: TS.CompilerOptions
): Array<TS.Diagnostic> {
  return [
    ...program.getSyntacticDiagnostics(),
    ...transformManager.getTransformDiagnostics(),
    ...program.getSemanticDiagnostics(),
    ...(options.declaration ? program.getDeclarationDiagnostics() : []),
  ];
}

function createCompilerHost(
  ts: TypeScript,
  options: TS.CompilerOptions,
  transformManager: TransformManager
): TS.CompilerHost {
  let host = options.incremental
    ? ts.createIncrementalCompilerHost(options, sysForCompilerHost(ts, transformManager))
    : ts.createCompilerHost(options);

  // @ts-ignore: This hook was added in TS5, and is safely irrelevant in earlier versions. Once we drop support for 4.x, we can also remove this @ts-ignore comment.
  host.resolveModuleNameLiterals = transformManager.resolveModuleNameLiterals;
  host.fileExists = transformManager.fileExists;
  host.readFile = transformManager.readTransformedFile;
  host.readDirectory = transformManager.readDirectory;

  return host;
}

function loadTsconfig(
  ts: TypeScript,
  transformManager: TransformManager,
  configPath: string | undefined,
  optionsToExtend: TS.CompilerOptions
): TS.ParsedCommandLine {
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
