import { expectTypeOf } from 'expect-type';
import { Globals, resolve, emitComponent } from '@glint/environment-ember-loose/-private/dsl';
import ArrayProxy from '@ember/array/proxy';

let each = resolve(Globals['each']);

// Yield out array values and indices

{
  const component = emitComponent(each({}, ['a', 'b', 'c']));

  {
    const [value, index] = component.blockParams.default;
    expectTypeOf(value).toEqualTypeOf<string>();
    expectTypeOf(index).toEqualTypeOf<number>();
  }

  {
    const [...args] = component.blockParams.inverse;
    expectTypeOf(args).toEqualTypeOf<[]>();
  }
}

// Works for Ember arrays

declare const proxiedArray: ArrayProxy<string>;

{
  const component = emitComponent(each({}, proxiedArray));

  {
    const [value, index] = component.blockParams.default;
    expectTypeOf(value).toEqualTypeOf<string>();
    expectTypeOf(index).toEqualTypeOf<number>();
  }
}

// Works for other iterables

{
  const component = emitComponent(each({}, new Map<string, symbol>()));

  {
    const [[key, value], index] = component.blockParams.default;
    expectTypeOf(key).toEqualTypeOf<string>();
    expectTypeOf(value).toEqualTypeOf<symbol>();
    expectTypeOf(index).toEqualTypeOf<number>();
  }
}

// Works for `readonly` arrays

{
  const component = emitComponent(each({}, ['a', 'b', 'c'] as readonly string[]));

  {
    const [value, index] = component.blockParams.default;
    expectTypeOf(value).toEqualTypeOf<string>();
    expectTypeOf(index).toEqualTypeOf<number>();
  }
}

// Accept a `key` string
{
  const component = emitComponent(each({ key: 'id' }, [{ id: 1 }]));

  {
    const [value, index] = component.blockParams.default;
    expectTypeOf(value).toEqualTypeOf<{ id: number }>();
    expectTypeOf(index).toEqualTypeOf<number>();
  }
}

declare const arrayOrUndefined: string[] | undefined;

// Works for undefined
{
  const component = emitComponent(each({}, arrayOrUndefined));

  {
    const [value, index] = component.blockParams.default;
    expectTypeOf(value).toEqualTypeOf<string>();
    expectTypeOf(index).toEqualTypeOf<number>();
  }
}

declare const arrayOrNull: string[] | null;

// Works for null
{
  const component = emitComponent(each({}, arrayOrNull));

  {
    const [value, index] = component.blockParams.default;
    expectTypeOf(value).toEqualTypeOf<string>();
    expectTypeOf(index).toEqualTypeOf<number>();
  }
}
