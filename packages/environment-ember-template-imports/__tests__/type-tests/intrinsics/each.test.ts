import ArrayProxy from '@ember/array/proxy';
import {
  emitComponent,
  Globals,
  NamedArgsMarker,
  resolve,
} from '@glint/environment-ember-template-imports/-private/dsl';
import { expectTypeOf } from 'expect-type';

let each = resolve(Globals['each']);

// Yield out array values and indices

{
  const component = emitComponent(each(['a', 'b', 'c']));

  {
    const [value, index] = component.blockParams.default;
    expectTypeOf(value).toEqualTypeOf<string>();
    expectTypeOf(index).toEqualTypeOf<number>();
  }

  {
    const [...args] = component.blockParams.else;
    expectTypeOf(args).toEqualTypeOf<[]>();
  }
}

// Works for Ember arrays

declare const proxiedArray: ArrayProxy<string>;

{
  const component = emitComponent(each(proxiedArray));

  {
    const [value, index] = component.blockParams.default;
    expectTypeOf(value).toEqualTypeOf<string>();
    expectTypeOf(index).toEqualTypeOf<number>();
  }
}

// Works for other iterables

{
  const component = emitComponent(each(new Map<string, symbol>()));

  {
    const [[key, value], index] = component.blockParams.default;
    expectTypeOf(key).toEqualTypeOf<string>();
    expectTypeOf(value).toEqualTypeOf<symbol>();
    expectTypeOf(index).toEqualTypeOf<number>();
  }
}

// Works for `readonly` arrays

{
  const component = emitComponent(each(['a', 'b', 'c'] as readonly string[]));

  {
    const [value, index] = component.blockParams.default;
    expectTypeOf(value).toEqualTypeOf<string>();
    expectTypeOf(index).toEqualTypeOf<number>();
  }
}

// Accept a `key` string
{
  const component = emitComponent(each([{ id: 1 }], { key: 'id', ...NamedArgsMarker }));

  {
    const [value, index] = component.blockParams.default;
    expectTypeOf(value).toEqualTypeOf<{ id: number }>();
    expectTypeOf(index).toEqualTypeOf<number>();
  }
}

declare const arrayOrUndefined: string[] | undefined;

// Works for undefined
{
  const component = emitComponent(each(arrayOrUndefined));

  {
    const [value, index] = component.blockParams.default;
    expectTypeOf(value).toEqualTypeOf<string>();
    expectTypeOf(index).toEqualTypeOf<number>();
  }
}

declare const arrayOrNull: string[] | null;

// Works for null
{
  const component = emitComponent(each(arrayOrNull));

  {
    const [value, index] = component.blockParams.default;
    expectTypeOf(value).toEqualTypeOf<string>();
    expectTypeOf(index).toEqualTypeOf<number>();
  }
}

// Gives `any` given `any`
{
  const component = emitComponent(each({} as any));
  expectTypeOf(component.blockParams.default).toEqualTypeOf<[any, number]>();
}

// Gives `any` given an invalid iterable (avoiding a cascade of type errors)
{
  const component = emitComponent(
    each(
      // @ts-expect-error: number is not a valid iterable
      123,
    ),
  );

  expectTypeOf(component.blockParams.default).toEqualTypeOf<[any, number]>();
}
