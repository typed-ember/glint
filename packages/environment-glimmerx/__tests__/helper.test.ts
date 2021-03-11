import { resolve } from '@glint/environment-glimmerx/types';
import { helper, fn as fnDefinition } from '@glint/environment-glimmerx';
import { expectTypeOf } from 'expect-type';
import { NoNamedArgs } from '@glint/template/-private';

// Built-in helper: `fn`
{
  let fn = resolve(fnDefinition);

  // @ts-expect-error: extra named arg
  fn({ foo: true }, () => true);

  // @ts-expect-error: invalid arg
  fn({}, (t: string) => t, 123);

  expectTypeOf(fn({}, () => true)).toEqualTypeOf<() => boolean>();
  expectTypeOf(fn({}, (arg: string) => arg.length)).toEqualTypeOf<(arg: string) => number>();
  expectTypeOf(fn({}, (arg: string) => arg.length, 'hi')).toEqualTypeOf<() => number>();

  let identity = <T>(x: T): T => x;

  // Bound type parameters are reflected in the output
  expectTypeOf(fn({}, identity, 'hi')).toEqualTypeOf<() => string>();

  // Unbound type parameters survive to the output
  expectTypeOf(fn({}, identity)).toEqualTypeOf<<T>(x: T) => T>();
}

// Custom helper: positional params
{
  let definition = helper(<T, U>([a, b]: [T, U]) => a || b);
  let or = resolve(definition);

  expectTypeOf(or).toEqualTypeOf<<T, U>(args: NoNamedArgs, t: T, u: U) => T | U>();

  // @ts-expect-error: extra named arg
  or({ hello: true }, 'a', 'b');

  // @ts-expect-error: missing positional arg
  or({}, 'a');

  // @ts-expect-error: extra positional arg
  or({}, 'a', 'b', 'c');

  expectTypeOf(or({}, 'a', 'b')).toEqualTypeOf<string>();
  expectTypeOf(or({}, 'a', true)).toEqualTypeOf<string | boolean>();
  expectTypeOf(or({}, false, true)).toEqualTypeOf<boolean>();
}

// Custom helper: named params
{
  let definition = helper((_: [], { word, count }: { word: string; count?: number }) => {
    return Array.from({ length: count ?? 2 }, () => word);
  });

  let repeat = resolve(definition);

  expectTypeOf(repeat).toEqualTypeOf<(args: { word: string; count?: number }) => Array<string>>();

  // @ts-expect-error: extra positional arg
  repeat({ word: 'hi' }, 123);

  // @ts-expect-error: missing required named arg
  repeat({ count: 3 });

  // @ts-expect-error: extra named arg
  repeat({ word: 'hello', foo: true });

  expectTypeOf(repeat({ word: 'hi' })).toEqualTypeOf<Array<string>>();
  expectTypeOf(repeat({ word: 'hi', count: 3 })).toEqualTypeOf<Array<string>>();
}

// Custom helper: bare function
{
  let definition = <T>(item: T, count?: number): Array<T> => {
    return Array.from({ length: count ?? 2 }, () => item);
  };

  let repeat = resolve(definition);

  expectTypeOf(repeat).toEqualTypeOf<<T>(args: NoNamedArgs, item: T, count?: number) => Array<T>>();

  // @ts-expect-error: unexpected named arg
  repeat({ word: 'hi' }, 123, 12);

  // @ts-expect-error: missing required positional arg
  repeat({});

  // @ts-expect-error: extra positional arg
  repeat({}, 'hi', 12, 'ok');

  expectTypeOf(repeat({}, 123)).toEqualTypeOf<Array<number>>();
  expectTypeOf(repeat({}, 'hi', 5)).toEqualTypeOf<Array<string>>();
}

// Custom helper: type guard
{
  let definition = (arg: unknown): arg is string => typeof arg === 'string';

  let isString = resolve(definition);

  expectTypeOf(isString).toEqualTypeOf<(args: NoNamedArgs, arg: unknown) => arg is string>();

  let x = 'hi' as string | number;
  if (isString({}, x)) {
    expectTypeOf(x).toEqualTypeOf<string>();
  } else {
    expectTypeOf(x).toEqualTypeOf<number>();
  }
}
