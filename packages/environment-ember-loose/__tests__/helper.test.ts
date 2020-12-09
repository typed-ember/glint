import Helper, { helper } from '@ember/component/helper';
import { resolve } from '@glint/environment-glimmerx/types';
import { expectTypeOf } from 'expect-type';
import { NoNamedArgs } from '@glint/template/-private';

// Functional helper: positional params
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

// Functional helper: named params
{
  let definition = helper(<T>(_: [], { value, count }: { value: T; count?: number }) => {
    return Array.from({ length: count ?? 2 }, () => value);
  });

  let repeat = resolve(definition);

  expectTypeOf(repeat).toEqualTypeOf<<T>(args: { value: T; count?: number }) => Array<T>>();

  // @ts-expect-error: extra positional arg
  repeat({ word: 'hi' }, 123);

  // @ts-expect-error: missing required named arg
  repeat({ count: 3 });

  // @ts-expect-error: extra named arg
  repeat({ word: 'hello', foo: true });

  expectTypeOf(repeat({ value: 'hi' })).toEqualTypeOf<Array<string>>();
  expectTypeOf(repeat({ value: 123, count: 3 })).toEqualTypeOf<Array<number>>();
}

// Class-based helper
{
  type RepeatArgs<T> = { value: T; count?: number };
  class RepeatHelper<T> extends Helper<[], RepeatArgs<T>, Array<T>> {
    // @ts-expect-error: this is incompatible with the base definition of `compute` in the upstream types
    compute(_: [], { value, count }: RepeatArgs<T>): Array<T> {
      return Array.from({ length: count ?? 2 }, () => value);
    }
  }

  let repeat = resolve(RepeatHelper);

  expectTypeOf(repeat).toEqualTypeOf<<T>(args: { value: T; count?: number }) => Array<T>>();

  // @ts-expect-error: extra positional arg
  repeat({ word: 'hi' }, 123);

  // @ts-expect-error: missing required named arg
  repeat({ count: 3 });

  // @ts-expect-error: extra named arg
  repeat({ word: 'hello', foo: true });

  expectTypeOf(repeat({ value: 'hi' })).toEqualTypeOf<Array<string>>();
  expectTypeOf(repeat({ value: 123, count: 3 })).toEqualTypeOf<Array<number>>();
}
