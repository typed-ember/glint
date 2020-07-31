import { helper, fn as fnDefinition } from '@glimmerx/helper';
import { resolve, invokeInline } from '@glint/environment-glimmerx/types';
import { expectTypeOf } from 'expect-type';
import { NoNamedArgs, ReturnsValue } from '@glint/template/-private';

// Built-in helper: `fn`
{
  let fn = resolve(fnDefinition);

  // @ts-expect-error: extra named arg
  fn({ foo: true }, () => true);

  // @ts-expect-error: invalid arg
  fn({}, (t: string) => t, 123);

  expectTypeOf(invokeInline(fn({}, () => true))).toEqualTypeOf<() => boolean>();
  expectTypeOf(invokeInline(fn({}, (arg: string) => arg.length))).toEqualTypeOf<
    (arg: string) => number
  >();
  expectTypeOf(invokeInline(fn({}, (arg: string) => arg.length, 'hi'))).toEqualTypeOf<
    () => number
  >();

  let identity = <T>(x: T): T => x;

  // Bound type parameters are reflected in the output
  expectTypeOf(invokeInline(fn({}, identity, 'hi'))).toEqualTypeOf<() => string>();

  // Unfortunately unbound type parameters degrade to `unknown`; this is a known limitation
  expectTypeOf(invokeInline(fn({}, identity))).toEqualTypeOf<(x: unknown) => unknown>();
}

// Custom helper: positional params
{
  let definition = helper(<T, U>([a, b]: [T, U]) => a || b);
  let or = resolve(definition);

  expectTypeOf(or).toEqualTypeOf<<T, U>(args: NoNamedArgs, t: T, u: U) => ReturnsValue<T | U>>();

  // @ts-expect-error: extra named arg
  or({ hello: true }, 'a', 'b');

  // @ts-expect-error: missing positional arg
  or({}, 'a');

  // @ts-expect-error: extra positional arg
  or({}, 'a', 'b', 'c');

  expectTypeOf(invokeInline(or({}, 'a', 'b'))).toEqualTypeOf<string>();
  expectTypeOf(invokeInline(or({}, 'a', true))).toEqualTypeOf<string | boolean>();
  expectTypeOf(invokeInline(or({}, false, true))).toEqualTypeOf<boolean>();
}

// Custom helper: named params
{
  let definition = helper((_: [], { word, count }: { word: string; count?: number }) => {
    return Array.from({ length: count ?? 2 }, () => word);
  });

  let repeat = resolve(definition);

  expectTypeOf(repeat).toEqualTypeOf<
    (args: { word: string; count?: number }) => ReturnsValue<Array<string>>
  >();

  // @ts-expect-error: extra positional arg
  repeat({ word: 'hi' }, 123);

  // @ts-expect-error: missing required named arg
  repeat({ count: 3 });

  // @ts-expect-error: extra named arg
  repeat({ word: 'hello', foo: true });

  expectTypeOf(invokeInline(repeat({ word: 'hi' }))).toEqualTypeOf<Array<string>>();
  expectTypeOf(invokeInline(repeat({ word: 'hi', count: 3 }))).toEqualTypeOf<Array<string>>();
}
