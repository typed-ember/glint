export function assert(test: unknown, message = 'Internal error'): asserts test {
  if (test == null || test === false) {
    throw new Error(message);
  }
}
