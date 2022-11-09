import type * as TS from 'typescript';

import { buildDiagnosticFormatter } from './diagnostics.js';
import { sysForCompilerHost } from './utils/sys-for-compiler-host.js';
import { patchProgram } from './utils/patch-program.js';
import TransformManagerPool from './utils/transform-manager-pool.js';

type TypeScript = typeof TS;

// Because `--clean` is public API for the CLI but *not* public in the type?!?
interface BuildOptions extends TS.BuildOptions {
  clean?: boolean | undefined;
}

export function performBuild(ts: TypeScript, projects: string[], buildOptions: BuildOptions): void {
  let transformManagerPool = new TransformManagerPool(ts.sys);
  let formatDiagnostic = buildDiagnosticFormatter(ts);

  let host = ts.createSolutionBuilderHost(
    sysForCompilerHost(ts, transformManagerPool),
    (...args) => {
      let program = ts.createEmitAndSemanticDiagnosticsBuilderProgram(...args);
      patchProgram(program, transformManagerPool);
      return program;
    },
    (diagnostic) => console.error(formatDiagnostic(diagnostic))
  );

  let builder = ts.createSolutionBuilder(host, projects, buildOptions);
  let exitStatus = buildOptions.clean ? builder.clean() : builder.build();
  process.exit(exitStatus);
}
