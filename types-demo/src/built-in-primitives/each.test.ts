import { expectType } from 'tsd';
import { resolve, BuiltIns, toBlock, invokeBlock } from '@gleam/core';
import { BlockYield } from '@gleam/core/-private/blocks';

const each = resolve(BuiltIns['each']);

// Yield out array values and indices
expectType<BlockYield<'body', [number, string]>>(
  invokeBlock(each({}, ['a', 'b', 'c']), {
    *default(value, index) {
      expectType<string>(value);
      expectType<number>(index);
      yield toBlock('body', index, value);
    },
  })
);

// Accept a `key` string
expectType<never>(
  invokeBlock(each({ key: 'id' }, [{ id: 1 }]), {
    *default() {
      // Don't yield
    },
  })
);
