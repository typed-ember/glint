import { expectTypeOf } from 'expect-type';
import { resolve, Globals, toBlock, invokeBlock } from '@glint/template';
import { BlockYield } from '@glint/template/-private/blocks';

const each = resolve(Globals['each']);

// Yield out array values and indices
expectTypeOf(
  invokeBlock(each({}, ['a', 'b', 'c']), {
    *default(value, index) {
      expectTypeOf(value).toEqualTypeOf<string>();
      expectTypeOf(index).toEqualTypeOf<number>();
      yield toBlock('body', index, value);
    },
  })
).toEqualTypeOf<BlockYield<'body', [number, string]>>();

// Accept a `key` string
expectTypeOf(
  invokeBlock(each({ key: 'id' }, [{ id: 1 }]), {
    *default() {
      // Don't yield
    },
  })
).toBeNever();
