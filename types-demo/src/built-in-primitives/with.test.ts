import { expectType, expectError } from 'tsd';
import { resolve, BuiltIns, toBlock, invokeBlock } from '@glint/template';
import { BlockYield } from '@glint/template/-private/blocks';

const withh = resolve(BuiltIns['with']);

// Yields out the given value
expectType<BlockYield<'body', [string]>>(
  invokeBlock(withh({}, 'hello'), {
    *default(str) {
      expectType<string>(str);
      yield toBlock('body', str);
    },
    *inverse() {
      yield toBlock('body', 'nothing');
    },
  })
);

// Rejects multiple values
expectError(withh({}, 'hello', 'goodbye'));
