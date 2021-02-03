export function determineOptionsToExtend(argv: {
  declaration?: boolean;
}): import('typescript').CompilerOptions {
  let options: import('typescript').CompilerOptions = {};

  if ('declaration' in argv) {
    options.noEmit = !argv.declaration;
    options.declaration = argv.declaration;
    options.emitDeclarationOnly = argv.declaration;
  } else {
    options.noEmit = true;
  }

  return options;
}
