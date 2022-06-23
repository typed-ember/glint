import type TS from 'typescript';

import { GlintConfig } from '@glint/config';

import { buildDiagnosticFormatter } from './diagnostics';
import { sysForWatchCompilerHost } from './utils/sys-for-watch';
import { patchProgram } from './utils/patch-program';
import TransformManager from '../common/transform-manager';

export function performBuildWatch(
  glintConfig: GlintConfig,
  rootNames: string[],
  buildOptions: TS.BuildOptions,
  watchOptions: TS.WatchOptions
): void {
  let transformManager = new TransformManager(glintConfig);

  let { ts } = glintConfig;
  let formatDiagnostic = buildDiagnosticFormatter(ts);
  let sys = sysForWatchCompilerHost(ts, transformManager);
  let host = ts.createSolutionBuilderWithWatchHost(
    sys,
    (...args) => {
      const program = ts.createEmitAndSemanticDiagnosticsBuilderProgram(...args);
      patchProgram(program, transformManager);
      return program;
    },
    (diagnostic) => console.error(formatDiagnostic(diagnostic))
  );

  let builder = ts.createSolutionBuilderWithWatch(host, rootNames, buildOptions, watchOptions);
  builder.build();
}
