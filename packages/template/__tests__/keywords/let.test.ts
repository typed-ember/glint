import { expectTypeOf } from 'expect-type';
import { invokeBlock, resolve } from '../../-private/dsl';
import { LetKeyword } from '../../-private/keywords';

const letKeyword = resolve({} as LetKeyword);

// Yields out the given values
invokeBlock(letKeyword({}, 'hello', 123), {
  default(str, num) {
    expectTypeOf(str).toEqualTypeOf<string>();
    expectTypeOf(num).toEqualTypeOf<number>();
  },
});
