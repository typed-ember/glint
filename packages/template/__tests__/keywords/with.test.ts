import { expectTypeOf } from 'expect-type';
import { resolve, toBlock, invokeBlock } from '@glint/template';
import { BlockYield } from '@glint/template/-private/blocks';
import { WithKeyword } from '@glint/template/-private/keywords';

const withKeyword = resolve({} as WithKeyword);

// Yields out the given value
expectTypeOf(
  invokeBlock(withKeyword({}, 'hello'), {
    *default(str) {
      expectTypeOf(str).toEqualTypeOf<string>();
      yield toBlock('body', str);
    },
    *inverse() {
      yield toBlock('body', 'nothing');
    },
  })
).toEqualTypeOf<BlockYield<'body', [string]>>();

// @ts-expect-error: Rejects multiple values
withKeyword({}, 'hello', 'goodbye');
