import { expectTypeOf } from 'expect-type';
import { invokeBlock, resolve } from '../../-private/dsl';
import { EachKeyword } from '../../-private/keywords';

const eachKeyword = resolve({} as EachKeyword);

// Yield out array values and indices

invokeBlock(eachKeyword({}, ['a', 'b', 'c']), {
  default(value, index) {
    expectTypeOf(value).toEqualTypeOf<string>();
    expectTypeOf(index).toEqualTypeOf<number>();
  },
});

// Accept a `key` string
invokeBlock(eachKeyword({ key: 'id' }, [{ id: 1 }]), {
  default() {
    // Don't yield
  },
});
