import { expectTypeOf } from 'expect-type';
import { resolve, BuiltIns, toBlock, invokeBlock } from '@glint/template';
import { BlockYield } from '@glint/template/-private/blocks';

const withh = resolve(BuiltIns['with']);

// Yields out the given value
expectTypeOf(
  invokeBlock(withh({}, 'hello'), {
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
withh({}, 'hello', 'goodbye');
