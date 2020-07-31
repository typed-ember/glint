import { expectTypeOf } from 'expect-type';
import { resolve, toBlock, invokeBlock } from '@glint/template';
import { BlockYield } from '@glint/template/-private/blocks';
import { LetKeyword } from '@glint/template/-private/keywords';

const letKeyword = resolve({} as LetKeyword);

// Yields out the given values
expectTypeOf(
  invokeBlock(letKeyword({}, 'hello', 123), {
    *default(str, num) {
      expectTypeOf(str).toEqualTypeOf<string>();
      expectTypeOf(num).toEqualTypeOf<number>();
      yield toBlock('body', num, str);
    },
  })
).toEqualTypeOf<BlockYield<'body', [number, string]>>();
