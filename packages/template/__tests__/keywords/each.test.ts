import { expectTypeOf } from 'expect-type';
import { resolve, toBlock, invokeBlock } from '@glint/template';
import { BlockYield } from '@glint/template/-private/blocks';
import { EachKeyword } from '@glint/template/-private/keywords';

const eachKeyword = resolve({} as EachKeyword);

// Yield out array values and indices
expectTypeOf(
  invokeBlock(eachKeyword({}, ['a', 'b', 'c']), {
    *default(value, index) {
      expectTypeOf(value).toEqualTypeOf<string>();
      expectTypeOf(index).toEqualTypeOf<number>();
      yield toBlock('body', index, value);
    },
  })
).toEqualTypeOf<BlockYield<'body', [number, string]>>();

// Accept a `key` string
expectTypeOf(
  invokeBlock(eachKeyword({ key: 'id' }, [{ id: 1 }]), {
    *default() {
      // Don't yield
    },
  })
).toBeNever();
