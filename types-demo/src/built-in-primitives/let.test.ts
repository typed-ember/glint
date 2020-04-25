import { expectType } from 'tsd';
import { resolve, BuiltIns, toBlock, invokeBlock } from '@glint/template';
import { BlockYield } from '@glint/template/-private/blocks';

const lett = resolve(BuiltIns['let']);

// Yields out the given values
expectType<BlockYield<'body', [number, string]>>(
  invokeBlock(lett({}, 'hello', 123), {
    *default(str, num) {
      expectType<string>(str);
      expectType<number>(num);
      yield toBlock('body', num, str);
    },
  })
);
