import { expectType, expectAssignable } from 'tsd';
import { resolve, BuiltIns, toBlock, invokeBlock } from '@glint/template';
import { BlockYield } from '@glint/template/-private/blocks';

const eachIn = resolve(BuiltIns['each-in']);

// Yield out key/value pairs from the given input
expectType<BlockYield<'body', [number]>>(
  invokeBlock(eachIn({}, { foo: 'hello' }), {
    *default(key, value) {
      expectAssignable<'foo'>(key);
      expectAssignable<string>(value);
      yield toBlock('body', value.length);
    },
  })
);
