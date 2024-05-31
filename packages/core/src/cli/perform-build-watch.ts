import type TS from 'typescript';

import { buildDiagnosticFormatter } from './diagnostics.js';
import { sysForCompilerHost } from './utils/sys-for-compiler-host.js';
import { patchProgramBuilder } from './utils/patch-program.js';
import TransformManagerPool from './utils/transform-manager-pool.js';

export function performBuildWatch(
  ts: typeof TS,
  projects: string[],
  buildOptions: TS.BuildOptions
): void {
  let transformManagerPool = new TransformManagerPool(ts);
  let formatDiagnostic = buildDiagnosticFormatter(ts);
  let buildProgram = ts.createEmitAndSemanticDiagnosticsBuilderProgram;

  let host = ts.createSolutionBuilderWithWatchHost(
    sysForCompilerHost(ts, transformManagerPool),
    patchProgramBuilder(ts, transformManagerPool, buildProgram),
    (diagnostic) => console.error(formatDiagnostic(diagnostic))
  );

  // @ts-ignore: This hook was added in TS5, and is safely irrelevant in earlier versions. Once we drop support for 4.x, we can also remove this @ts-ignore comment.
  host.resolveModuleNameLiterals = transformManagerPool.resolveModuleNameLiterals;

  let builder = ts.createSolutionBuilderWithWatch(host, projects, buildOptions);
  builder.build();
}
