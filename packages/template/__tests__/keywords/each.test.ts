import { expectTypeOf } from 'expect-type';
import { emitComponent, bindBlocks, resolve } from '../../-private/dsl';
import { EachKeyword } from '../../-private/keywords';

const eachKeyword = resolve({} as EachKeyword);

// Yield out array values and indices

emitComponent(eachKeyword({}, ['a', 'b', 'c']), (component) => {
  bindBlocks(component.blockParams, {
    default(value, index) {
      expectTypeOf(value).toEqualTypeOf<string>();
      expectTypeOf(index).toEqualTypeOf<number>();
    },
  });
});

// Works for `readonly` arrays

emitComponent(eachKeyword({}, ['a', 'b', 'c'] as readonly string[]), (component) => {
  bindBlocks(component.blockParams, {
    default(value, index) {
      expectTypeOf(value).toEqualTypeOf<string>();
      expectTypeOf(index).toEqualTypeOf<number>();
    },
  });
});

// Accept a `key` string
emitComponent(eachKeyword({ key: 'id' }, [{ id: 1 }]), (component) => {
  bindBlocks(component.blockParams, {
    default() {
      // Don't yield
    },
  });
});
