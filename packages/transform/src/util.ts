export function unreachable(value: never, message = 'unreachable code'): never {
  throw new Error(`[@glint/transform] Internal error: ${message}`);
}

export function assert(test: unknown, message = 'Internal error'): asserts test {
  if (test == null || test === false) {
    throw new Error(message);
  }
}

export function isJsScript(uriOrFilePath: string): boolean {
  return uriOrFilePath.endsWith('.js');
}
