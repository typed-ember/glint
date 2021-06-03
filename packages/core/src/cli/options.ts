export function determineOptionsToExtend(argv: {
  declaration?: boolean | undefined;
}): import('typescript').CompilerOptions {
  let options: import('typescript').CompilerOptions = {};

  if ('declaration' in argv) {
    options.noEmit = !argv.declaration;
    options.declaration = Boolean(argv.declaration);
    options.emitDeclarationOnly = Boolean(argv.declaration);
  } else {
    options.noEmit = true;
  }

  return options;
}
