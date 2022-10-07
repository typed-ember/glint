import TransformManager from '../common/transform-manager';
import { GlintConfig } from '@glint/config';
import { buildDiagnosticFormatter } from './diagnostics';
import type ts from 'typescript';
import { sysForCompilerHost } from './utils/sys-for-compiler-host';
import { patchProgram } from './utils/patch-program';

export type TypeScript = typeof ts;

export function performWatch(glintConfig: GlintConfig, optionsToExtend: ts.CompilerOptions): void {
  let { ts } = glintConfig;
  let transformManager = new TransformManager(glintConfig);
  let formatDiagnostic = buildDiagnosticFormatter(ts);
  let host = ts.createWatchCompilerHost(
    glintConfig.configPath,
    optionsToExtend,
    sysForCompilerHost(ts, transformManager),
    ts.createSemanticDiagnosticsBuilderProgram, // TODO: patch it *here* instead of `afterProgramCreate` below?()
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
