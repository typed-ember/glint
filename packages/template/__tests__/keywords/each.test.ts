import { expectTypeOf } from 'expect-type';
import { emitComponent, resolve } from '../../-private/dsl';
import { EachKeyword } from '../../-private/keywords';

const eachKeyword = resolve({} as EachKeyword);

// Yield out array values and indices

{
  const component = emitComponent(eachKeyword({}, ['a', 'b', 'c']));

  {
    const [value, index] = component.blockParams.default;
    expectTypeOf(value).toEqualTypeOf<string>();
    expectTypeOf(index).toEqualTypeOf<number>();
  }
}

// Works for `readonly` arrays

{
  const component = emitComponent(eachKeyword({}, ['a', 'b', 'c'] as readonly string[]));

  {
    const [value, index] = component.blockParams.default;
    expectTypeOf(value).toEqualTypeOf<string>();
    expectTypeOf(index).toEqualTypeOf<number>();
  }
}

// Accept a `key` string
emitComponent(eachKeyword({ key: 'id' }, [{ id: 1 }]));
