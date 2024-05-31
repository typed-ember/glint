import TransformManager from '../common/transform-manager.js';
import { GlintConfig } from '../config/index.js';
import { buildDiagnosticFormatter } from './diagnostics.js';
import type ts from 'typescript';
import { sysForCompilerHost } from './utils/sys-for-compiler-host.js';
import { patchProgramBuilder } from './utils/patch-program.js';

export type TypeScript = typeof ts;

export function performWatch(glintConfig: GlintConfig, optionsToExtend: ts.CompilerOptions): void {
  let { ts } = glintConfig;
  let transformManager = new TransformManager(glintConfig);
  let formatDiagnostic = buildDiagnosticFormatter(ts);
  let host = ts.createWatchCompilerHost(
    glintConfig.configPath,
    optionsToExtend,
    sysForCompilerHost(ts, transformManager),
    patchProgramBuilder(ts, transformManager, ts.createSemanticDiagnosticsBuilderProgram),
    (diagnostic) => console.error(formatDiagnostic(diagnostic))
  );

  // @ts-ignore: This hook was added in TS5, and is safely irrelevant in earlier versions. Once we drop support for 4.x, we can also remove this @ts-ignore comment.
  host.resolveModuleNameLiterals = transformManager.resolveModuleNameLiterals;

  ts.createWatchProgram(host);
}
