import type TS from 'typescript';

import { GlintConfig } from '@glint/config';

import TransformManager from '../common/transform-manager';
import { buildDiagnosticFormatter } from './diagnostics';
import { patchProgram } from './utils/patch-program';

type TypeScript = typeof TS;

// Because `--clean` is public API for the CLI but *not* public in the type?!?
interface BuildOptions extends TS.BuildOptions {
  clean?: boolean | undefined;
}

export function performBuild(
  glintConfig: GlintConfig,
  projects: string[],
  buildOptions: BuildOptions
): void {
  let transformManager = new TransformManager(glintConfig);

  let { ts } = glintConfig;
  let host = createCompilerHost(ts, transformManager);
  let builder = ts.createSolutionBuilder(host, projects, buildOptions);

  let exitStatus = buildOptions.clean ? builder.clean() : builder.build();
  process.exit(exitStatus);
}

type BuilderHost = TS.SolutionBuilderHost<TS.EmitAndSemanticDiagnosticsBuilderProgram>;

function createCompilerHost(ts: TypeScript, transformManager: TransformManager): BuilderHost {
  let formatDiagnostic = buildDiagnosticFormatter(ts);

  let host = ts.createSolutionBuilderHost(
    sysForBuildCompilerHost(ts, transformManager),
    (...args) => {
      let program = ts.createEmitAndSemanticDiagnosticsBuilderProgram(...args);
      patchProgram(program, transformManager);
      return program;
    },
    (diagnostic) => console.error(formatDiagnostic(diagnostic))
  );

  host.fileExists = transformManager.fileExists;
  host.readFile = transformManager.readTransformedFile;
  host.readDirectory = transformManager.readDirectory;

  return host;
}

function sysForBuildCompilerHost(
  ts: TypeScript,
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
