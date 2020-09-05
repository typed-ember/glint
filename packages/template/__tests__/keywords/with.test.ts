import { expectTypeOf } from 'expect-type';
import { resolve, invokeBlock } from '@glint/template';
import { WithKeyword } from '@glint/template/-private/keywords';

const withKeyword = resolve({} as WithKeyword);

// Yields out the given value
invokeBlock(withKeyword({}, 'hello'), {
  default(str) {
    expectTypeOf(str).toEqualTypeOf<string>();
  },
  inverse() {
    // Nothing
  },
});

// @ts-expect-error: Rejects multiple values
withKeyword({}, 'hello', 'goodbye');
