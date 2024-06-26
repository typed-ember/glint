// import type TS from 'typescript';

// import { buildDiagnosticFormatter } from './diagnostics.js';
// import { sysForCompilerHost } from './utils/sys-for-compiler-host.js';
// import { patchProgramBuilder } from './utils/patch-program.js';
// import TransformManagerPool from './utils/transform-manager-pool.js';

// type TypeScript = typeof TS;

// // Because `--clean` is public API for the CLI but *not* public in the type?!?
// interface BuildOptions extends TS.BuildOptions {
//   clean?: boolean | undefined;
// }

// export function performBuild(ts: TypeScript, projects: string[], buildOptions: BuildOptions): void {
//   let transformManagerPool = new TransformManagerPool(ts);
//   let formatDiagnostic = buildDiagnosticFormatter(ts);
//   let buildProgram = ts.createEmitAndSemanticDiagnosticsBuilderProgram;

//   let host = ts.createSolutionBuilderHost(
//     sysForCompilerHost(ts, transformManagerPool),
//     patchProgramBuilder(ts, transformManagerPool, buildProgram),
//     (diagnostic) => console.error(formatDiagnostic(diagnostic))
//   );

//   // @ts-ignore: This hook was added in TS5, and is safely irrelevant in earlier versions. Once we drop support for 4.x, we can also remove this @ts-ignore comment.
//   host.resolveModuleNameLiterals = transformManagerPool.resolveModuleNameLiterals;

//   let builder = ts.createSolutionBuilder(host, projects, buildOptions);
//   let exitStatus = buildOptions.clean ? builder.clean() : builder.build();
//   process.exit(exitStatus);
// }
