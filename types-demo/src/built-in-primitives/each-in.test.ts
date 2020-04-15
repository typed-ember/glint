import { expectType, expectAssignable } from 'tsd';
import { resolve, BuiltIns, toBlock, invokeBlock } from '@gleam/core';
import { BlockYield } from '@gleam/core/-private/blocks';

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
