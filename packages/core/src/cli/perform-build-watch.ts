import type * as TS from 'typescript';

import { buildDiagnosticFormatter } from './diagnostics';
import { sysForCompilerHost } from './utils/sys-for-compiler-host';
import { patchProgram } from './utils/patch-program';
import TransformManagerPool from './utils/transform-manager-pool';

export function performBuildWatch(
  ts: typeof TS,
  projects: string[],
  buildOptions: TS.BuildOptions
): void {
  let transformManagerPool = new TransformManagerPool(ts.sys);
  let formatDiagnostic = buildDiagnosticFormatter(ts);

  let host = ts.createSolutionBuilderWithWatchHost(
    sysForCompilerHost(ts, transformManagerPool),
    (...args) => {
      const program = ts.createEmitAndSemanticDiagnosticsBuilderProgram(...args);
      patchProgram(program, transformManagerPool);
      return program;
    },
    (diagnostic) => console.error(formatDiagnostic(diagnostic))
  );

  let builder = ts.createSolutionBuilderWithWatch(host, projects, buildOptions);
  builder.build();
}
