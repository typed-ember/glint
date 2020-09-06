import { expectTypeOf } from 'expect-type';
import { resolve, invokeBlock } from '@glint/template';
import { LetKeyword } from '@glint/template/-private/keywords';

const letKeyword = resolve({} as LetKeyword);

// Yields out the given values
invokeBlock(letKeyword({}, 'hello', 123), {
  default(str, num) {
    expectTypeOf(str).toEqualTypeOf<string>();
    expectTypeOf(num).toEqualTypeOf<number>();
  },
});
