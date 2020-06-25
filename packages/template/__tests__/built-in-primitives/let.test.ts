import { expectTypeOf } from 'expect-type';
import { resolve, BuiltIns, toBlock, invokeBlock } from '@glint/template';
import { BlockYield } from '@glint/template/-private/blocks';

const lett = resolve(BuiltIns['let']);

// Yields out the given values
expectTypeOf(
  invokeBlock(lett({}, 'hello', 123), {
    *default(str, num) {
      expectTypeOf(str).toEqualTypeOf<string>();
      expectTypeOf(num).toEqualTypeOf<number>();
      yield toBlock('body', num, str);
    },
  })
).toEqualTypeOf<BlockYield<'body', [number, string]>>();
