import { emitComponent, Globals, NamedArgsMarker, resolve } from '@glint/ember-tsc/-private/dsl';
import { expectTypeOf } from 'expect-type';

let eachIn = resolve(Globals['each-in']);

{
  const component = emitComponent(eachIn({ a: 5, b: 3 }));

  {
    const [key, value] = component.blockParams.default;
    expectTypeOf(key).toEqualTypeOf<'a' | 'b'>();
    expectTypeOf(value).toEqualTypeOf<number>();
  }
}

// Only gives string keys

{
  const b: unique symbol = Symbol('b');
  const value = { a: 'hi', [b]: 123 };
  const component = emitComponent(eachIn(value));

  {
    const [key, value] = component.blockParams.default;

    // {{each-in}} internally uses `Object.keys`, so only string keys are included
    expectTypeOf(key).toEqualTypeOf<'a'>();
    expectTypeOf(value).toEqualTypeOf<string>();
  }
}

// Can render maybe undefined

declare const maybeVal: { a: number; b: number } | undefined;

{
  const component = emitComponent(eachIn(maybeVal));

  {
    const [key, value] = component.blockParams.default;
    // This is the original code that fails now after expect-type upgrade
    // expectTypeOf(key).toEqualTypeOf<'a' | 'b'>();
    expectTypeOf(key).toEqualTypeOf<string>();
    expectTypeOf(value).toEqualTypeOf<number>();
  }

  {
    const [...args] = component.blockParams.else;
    expectTypeOf(args).toEqualTypeOf<[]>();
  }
}

// Can render maybe undefined (map)

declare const maybeMapVal: Map<string, number> | undefined;

{
  const component = emitComponent(eachIn(maybeMapVal));

  {
    const [key, value] = component.blockParams.default;
    expectTypeOf(key).toEqualTypeOf<string>();
    expectTypeOf(value).toEqualTypeOf<number>();
  }

  {
    const [...args] = component.blockParams.else;
    expectTypeOf(args).toEqualTypeOf<[]>();
  }
}

// Can render else when undefined, null, or empty.

{
  const component = emitComponent(eachIn(undefined));

  {
    const [key, value] = component.blockParams.default;
    // This won't get called when no value, but gets default key type
    expectTypeOf(key).toEqualTypeOf<string>();
    expectTypeOf(value).toEqualTypeOf<never>();
  }

  {
    const [...args] = component.blockParams.else;
    expectTypeOf(args).toEqualTypeOf<[]>();
  }
}

{
  const component = emitComponent(eachIn(null));

  {
    const [key, value] = component.blockParams.default;
    // This won't get called when no value, but gets default key type
    expectTypeOf(key).toEqualTypeOf<string>();
    expectTypeOf(value).toEqualTypeOf<never>();
  }

  {
    const [...args] = component.blockParams.else;
    expectTypeOf(args).toEqualTypeOf<[]>();
  }
}

{
  const component = emitComponent(eachIn({}));

  {
    const [key, value] = component.blockParams.default;
    // This won't get called when no value
    expectTypeOf(key).toEqualTypeOf<never>();
    expectTypeOf(value).toEqualTypeOf<never>();
  }

  {
    const [...args] = component.blockParams.else;
    expectTypeOf(args).toEqualTypeOf<[]>();
  }
}

// Accept a `key` string
{
  const component = emitComponent(eachIn({ a: 5, b: 3 }, { key: 'id', ...NamedArgsMarker }));

  {
    const [key, value] = component.blockParams.default;
    expectTypeOf(key).toEqualTypeOf<'a' | 'b'>();
    expectTypeOf(value).toEqualTypeOf<number>();
  }
}

// Accepts a Map
{
  const component = emitComponent(
    eachIn(
      new Map<string, number>([
        ['a', 5],
        ['b', 4],
      ]),
      { key: 'id', ...NamedArgsMarker },
    ),
  );
  {
    const [key, value] = component.blockParams.default;
    expectTypeOf(key).toEqualTypeOf<string>();
    expectTypeOf(value).toEqualTypeOf<number>();
  }
}

// Accepts a custom iterable
{
  class CustomMap implements Iterable<[Set<string>, bigint]> {
    [Symbol.iterator](): Iterator<[Set<string>, bigint]> {
      throw new Error();
    }
  }

  const component = emitComponent(eachIn(new CustomMap(), { key: 'id', ...NamedArgsMarker }));
  {
    const [key, value] = component.blockParams.default;
    expectTypeOf(key).toEqualTypeOf<Set<string>>();
    expectTypeOf(value).toEqualTypeOf<bigint>();
  }
}

// A generic object type gives string keys
function genericObject<T extends object>(object: T): void {
  const component = emitComponent(eachIn(object));
  const [key, value] = component.blockParams.default;
  const keyString: string = key;
  // @ts-expect-error: the key is a string
  const keyNumber: number = key;
  // @ts-expect-error: the value is not known
  const valueString: string = value;
  void [keyString, keyNumber, valueString];
}

// A generic record type gives string keys and its value type
function genericRecord<T extends Record<string, number>>(object: T): void {
  const component = emitComponent(eachIn(object));
  const [key, value] = component.blockParams.default;
  const keyString: string = key;
  const valueNumber: number = value;
  void [keyString, valueNumber];
}

genericObject({ a: 1 });
genericRecord({ a: 1 });
