import type TS from 'typescript';

import { buildDiagnosticFormatter } from './diagnostics';
import { patchProgram } from './utils/patch-program';
import TransformManagerPool from './utils/transform-manager-pool';
import { sysForCompilerHost } from './utils/sys-for-compiler-host';

type TypeScript = typeof TS;

// Because `--clean` is public API for the CLI but *not* public in the type?!?
interface BuildOptions extends TS.BuildOptions {
  clean?: boolean | undefined;
}

export function performBuild(ts: TypeScript, projects: string[], buildOptions: BuildOptions): void {
  let transformManagerPool = new TransformManagerPool(ts.sys);

  let host = createCompilerHost(ts, transformManagerPool);
  let builder = ts.createSolutionBuilder(host, projects, buildOptions);

  let exitStatus = buildOptions.clean ? builder.clean() : builder.build();
  process.exit(exitStatus);
}

type BuilderHost = TS.SolutionBuilderHost<TS.EmitAndSemanticDiagnosticsBuilderProgram>;

function createCompilerHost(
  ts: TypeScript,
  transformManagerPool: TransformManagerPool
): BuilderHost {
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

  return host;
}
