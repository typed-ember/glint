import { type CompilerOptions } from 'typescript';

export function determineOptionsToExtend(argv: {
  declaration?: boolean | undefined;
  incremental?: boolean | undefined;
}): import('typescript').CompilerOptions {
  let options: CompilerOptions = { incremental: argv.incremental };

  if ('declaration' in argv) {
    options.noEmit = !argv.declaration;
    options.declaration = Boolean(argv.declaration);
    options.emitDeclarationOnly = Boolean(argv.declaration);
  } else if ('build' in argv) {
    options.noEmit = false;
    options.declaration = true;
    options.emitDeclarationOnly = true;
  } else {
    options.noEmit = true;
    options.declaration = false;
  }

  return options;
}
