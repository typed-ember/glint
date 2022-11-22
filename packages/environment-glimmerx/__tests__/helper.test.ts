import { emitContent, NamedArgsMarker, resolve } from '@glint/environment-glimmerx/-private/dsl';
import { helper, fn as fnDefinition } from '@glimmerx/helper';
import { NamedArgs } from '@glint/template/-private/integration';
import { expectTypeOf } from 'expect-type';
import '@glint/environment-glimmerx';

// Built-in helper: `fn`
{
  let fn = resolve(fnDefinition);

  fn(
    (t: string) => t,
    // @ts-expect-error: invalid arg
    123
  );

  expectTypeOf(fn(() => true)).toEqualTypeOf<() => boolean>();
  expectTypeOf(fn((arg: string) => arg.length)).toEqualTypeOf<(arg: string) => number>();
  expectTypeOf(fn((arg: string) => arg.length, 'hi')).toEqualTypeOf<() => number>();

  let identity = <T>(x: T): T => x;

  // Bound type parameters are reflected in the output
  expectTypeOf(fn(identity, 'hi')).toEqualTypeOf<() => string>();

  // Unbound type parameters survive to the output
  expectTypeOf(fn(identity)).toEqualTypeOf<{ <T>(x: T): T }>();
}

// Custom helper: positional params
{
  let definition = helper(<T, U>([a, b]: [T, U]) => a || b);
  let or = resolve(definition);

  expectTypeOf(or).toEqualTypeOf<{ <T, U>(t: T, u: U): T | U }>();

  or('a', 'b', {
    // @ts-expect-error: extra named arg
    hello: true,
    ...NamedArgsMarker,
  });

  // @ts-expect-error: missing positional arg
  or('a');

  or(
    'a',
    'b',
    // @ts-expect-error: extra positional arg
    'c'
  );

  expectTypeOf(or('a', 'b')).toEqualTypeOf<string>();
  expectTypeOf(or('a' as string, true as boolean)).toEqualTypeOf<string | boolean>();
  expectTypeOf(or(false, true)).toEqualTypeOf<boolean>();
}

// Custom helper: named params
{
  let definition = helper((_: [], { word, count }: { word: string; count?: number }) => {
    return Array.from({ length: count ?? 2 }, () => word);
  });

  let repeat = resolve(definition);

  expectTypeOf(repeat).toEqualTypeOf<
    (args: NamedArgs<{ word: string; count?: number }>) => Array<string>
  >();

  // @ts-expect-error: extra positional arg
  repeat(123, { word: 'hi', ...NamedArgsMarker });

  // @ts-expect-error: missing required named arg
  repeat({ count: 3, ...NamedArgsMarker });

  repeat({
    word: 'hello',
    // @ts-expect-error: extra named arg
    foo: true,
    ...NamedArgsMarker,
  });

  expectTypeOf(repeat({ word: 'hi', ...NamedArgsMarker })).toEqualTypeOf<Array<string>>();
  expectTypeOf(repeat({ word: 'hi', count: 3, ...NamedArgsMarker })).toEqualTypeOf<Array<string>>();
}

// Custom helper: bare function
{
  let definition = <T>(item: T, count?: number): Array<T> => {
    return Array.from({ length: count ?? 2 }, () => item);
  };

  let repeat = resolve(definition);

  expectTypeOf(repeat).toEqualTypeOf<{
    <T>(item: T, count?: number): Array<T>;
  }>();

  repeat(
    123,
    12,
    // @ts-expect-error: unexpected named arg
    { word: 'hi', ...NamedArgsMarker }
  );

  // @ts-expect-error: missing required positional arg
  repeat();

  // @ts-expect-error: extra positional arg
  repeat('hi', 12, 'ok');

  expectTypeOf(repeat(123)).toEqualTypeOf<Array<number>>();
  expectTypeOf(repeat('hi', 5)).toEqualTypeOf<Array<string>>();
}

// Custom helper: type guard
{
  let definition = (arg: unknown): arg is string => typeof arg === 'string';

  let isString = resolve(definition);

  expectTypeOf(isString).toEqualTypeOf<(arg: unknown) => arg is string>();

  let x = 'hi' as string | number;
  if (isString(x)) {
    expectTypeOf(x).toEqualTypeOf<string>();
  } else {
    expectTypeOf(x).toEqualTypeOf<number>();
  }
}

// Custom helper that accepts `unknown`
// (and therefore plausibly could be interpreted as a modifier, but shouldn't be)
{
  let definition = (_arg: unknown, callback: () => void): void => callback();

  let hackyOnChange = resolve(definition);

  expectTypeOf(hackyOnChange).toEqualTypeOf<(arg: unknown, callback: () => void) => void>();

  emitContent(hackyOnChange('hello', () => console.log('change!')));
}
