import Helper, { helper, EmptyObject } from '@ember/component/helper';
import { resolve } from '@glint/environment-ember-loose/-private/dsl';
import { resolve as resolveWithoutFunctionResolution } from '@glint/environment-ember-loose/-private/dsl/without-function-resolution';
import { expectTypeOf } from 'expect-type';
import { HelperLike } from '@glint/template';
import { EmptyObject as GlintEmptyObject } from '@glint/template/-private/integration';

// Functional helper: fixed signature params
{
  interface InfoSignature {
    Args: {
      Named: { age: number };
      Positional: [name: string];
    };
    Return: string;
  }

  let definition = helper<InfoSignature>(
    ([name]: [string], { age }: { age: number }) => `${name}: ${age}`
  );
  let info = resolve(definition);

  expectTypeOf(info).toEqualTypeOf<(named: { age: number }, name: string) => string>();

  info(
    // @ts-expect-error: missing named arg
    {},
    'Tom'
  );

  info(
    {
      // @ts-expect-error: extra named arg
      hello: true,
      age: 123,
    },
    'Tom'
  );

  // @ts-expect-error: missing positional arg
  info({ age: 123 });

  // @ts-expect-error: extra positional arg
  info({ age: 123 }, 'Tom', 'Ster');

  expectTypeOf(info({ age: 123 }, 'Tom')).toEqualTypeOf<string>();
}

// Functional helper: generic positional params
{
  let definition = helper(<T, U>([a, b]: [T, U]) => a || b);
  let or = resolve(definition);

  expectTypeOf(or).toEqualTypeOf<{ <T, U>(args: EmptyObject, t: T, u: U): T | U }>();

  // @ts-expect-error: extra named arg
  or({ hello: true }, 'a', 'b');

  // @ts-expect-error: missing positional arg
  or({}, 'a');

  // @ts-expect-error: extra positional arg
  or({}, 'a', 'b', 'c');

  expectTypeOf(or({}, 'a', 'b')).toEqualTypeOf<string>();
  expectTypeOf(or({}, 'a' as string, true as boolean)).toEqualTypeOf<string | boolean>();
  expectTypeOf(or({}, false, true)).toEqualTypeOf<boolean>();
}

// Functional helper: generic named params
{
  let definition = helper(<T>(_: [], { value, count }: { value: T; count?: number }) => {
    return Array.from({ length: count ?? 2 }, () => value);
  });

  let repeat = resolve(definition);

  expectTypeOf(repeat).toEqualTypeOf<{ <T>(args: { value: T; count?: number }): Array<T> }>();

  // @ts-expect-error: extra positional arg
  repeat({ word: 'hi' }, 123);

  // @ts-expect-error: missing required named arg
  repeat({ count: 3 });

  // @ts-expect-error: extra named arg
  repeat({ word: 'hello', foo: true });

  expectTypeOf(repeat({ value: 'hi' })).toEqualTypeOf<Array<string>>();
  expectTypeOf(repeat({ value: 123, count: 3 })).toEqualTypeOf<Array<number>>();
}

// Class-based helper: named args
{
  type RepeatArgs<T> = { value: T; count?: number };
  class RepeatHelper<T> extends Helper<{ Args: { Named: RepeatArgs<T> }; Return: Array<T> }> {
    override compute(_: [], { value, count }: RepeatArgs<T>): Array<T> {
      return Array.from({ length: count ?? 2 }, () => value);
    }
  }

  let repeat = resolve(RepeatHelper);

  expectTypeOf(repeat).toEqualTypeOf<{ <T>(args: { value: T; count?: number }): Array<T> }>();

  repeat(
    { word: 'hi' },
    // @ts-expect-error: extra positional arg
    123
  );

  // @ts-expect-error: missing required named arg
  repeat({ count: 3 });

  repeat({
    value: 'hello',
    // @ts-expect-error: extra named arg
    foo: true,
  });

  expectTypeOf(repeat({ value: 'hi' })).toEqualTypeOf<Array<string>>();
  expectTypeOf(repeat({ value: 123, count: 3 })).toEqualTypeOf<Array<number>>();
}

// Class-based helper: positional args
{
  type RepeatArgs<T> = [value: T, count?: number | undefined];
  class RepeatHelper<T> extends Helper<{ Args: { Positional: RepeatArgs<T> }; Return: Array<T> }> {
    override compute([value, count]: RepeatArgs<T>): Array<T> {
      return Array.from({ length: count ?? 2 }, () => value);
    }
  }

  let repeat = resolve(RepeatHelper);

  expectTypeOf(repeat).toEqualTypeOf<{
    <T>(args: GlintEmptyObject, value: T, count?: number | undefined): Array<T>;
  }>();

  repeat(
    // @ts-expect-error: extra named arg
    { word: 'hi' },
    'hello'
  );

  // @ts-expect-error: missing required positional arg
  repeat({});

  repeat(
    {},
    'hello',
    123,
    // @ts-expect-error: extra positional arg
    'hi'
  );

  expectTypeOf(repeat({}, 'hi')).toEqualTypeOf<Array<string>>();
  expectTypeOf(repeat({}, 123, 3)).toEqualTypeOf<Array<number>>();
}

// Class-based helpers can return undefined
{
  class MaybeStringHelper extends Helper<{ Return: string | undefined }> {
    override compute(): string | undefined {
      if (Math.random() > 0.5) {
        return 'ok';
      }
    }
  }

  let maybeString = resolve(MaybeStringHelper);

  expectTypeOf(maybeString).toEqualTypeOf<(args: GlintEmptyObject) => string | undefined>();
}

// Helpers are `HelperLike`
{
  interface TestSignature {
    Args: {
      Named: { count: number };
      Positional: [value: string];
    };
    Return: Array<string>;
  }

  class MyHelper extends Helper<TestSignature> {}
  const myHelper = helper<TestSignature>(() => []);

  expectTypeOf(MyHelper).toMatchTypeOf<HelperLike<TestSignature>>();
  expectTypeOf(myHelper).toMatchTypeOf<HelperLike<TestSignature>>();
}

// Bare-function helpers
{
  // @ts-expect-error: the env with no support for function resolution should reject this
  resolveWithoutFunctionResolution(() => 'hi');

  let positionalOnlyConcrete = resolve((a: number, b: number) => a + b);
  expectTypeOf(positionalOnlyConcrete).toEqualTypeOf<
    (named: GlintEmptyObject, a: number, b: number) => number
  >();
  expectTypeOf(positionalOnlyConcrete({}, 1, 2)).toBeNumber();

  let positionalOnlyGeneric = resolve(<A, B>(a: A, b: B): [A, B] => [a, b]);
  expectTypeOf(positionalOnlyGeneric).toEqualTypeOf<
    <A, B>(named: GlintEmptyObject, a: A, b: B) => [A, B]
  >();
  expectTypeOf(positionalOnlyGeneric({}, 'hi', true)).toEqualTypeOf<[string, boolean]>();
  expectTypeOf(positionalOnlyGeneric({}, 123, Symbol())).toEqualTypeOf<[number, symbol]>();

  let mixedConcrete = resolve(
    (a: number, b: number, named: { fallback: number }) => named.fallback
  );
  expectTypeOf(mixedConcrete).toEqualTypeOf<
    (named: { fallback: number }, a: number, b: number) => number
  >();
  expectTypeOf(mixedConcrete({ fallback: 123 }, 1, 2)).toBeNumber();

  let mixedGenericNamed = resolve(
    <T>(a: number, b: number, named: { fallback: T }) => a + b || named.fallback
  );
  expectTypeOf(mixedGenericNamed).toEqualTypeOf<
    <T>(named: { fallback: T }, a: number, b: number) => T | number
  >();
  expectTypeOf(mixedGenericNamed({ fallback: 'hi' }, 1, 2)).toEqualTypeOf<number | string>();
  expectTypeOf(mixedGenericNamed({ fallback: 3 }, 1, 2)).toBeNumber();

  let mixedGenericPositional = resolve(
    <T>(a: T, b: T, named: { fallback: string }): string | T => a || b || named.fallback
  );
  expectTypeOf(mixedGenericPositional).toEqualTypeOf<
    <T>(named: { fallback: string }, a: T, b: T) => T | string
  >();
  expectTypeOf(mixedGenericPositional({ fallback: 'hi' }, 'a', 'b')).toBeString();
  expectTypeOf(mixedGenericPositional({ fallback: 'hi' }, 1, 2)).toEqualTypeOf<string | number>();
  // @ts-expect-error: inconsistent T
  mixedGenericPositional({ fallback: 'hi' }, 'a', 123);

  let mixedGeneric = resolve(<A, B, C>(a: A, b: B, named: { c: C }): [A, B, C] => [a, b, named.c]);
  expectTypeOf(mixedGeneric).toEqualTypeOf<<A, B, C>(named: { c: C }, a: A, b: B) => [A, B, C]>();
  expectTypeOf(mixedGeneric({ c: 'hi' }, 123, false)).toEqualTypeOf<[number, boolean, string]>();

  let namedOnlyConcrete = resolve((named: { age: number; name: string }) => named.name);
  expectTypeOf(namedOnlyConcrete).toEqualTypeOf<(named: { age: number; name: string }) => string>();
  expectTypeOf(namedOnlyConcrete({ age: 100, name: 'Alex' })).toBeString();

  let namedOnlyGeneric = resolve(<T, U>(named: { t: T; u: U }): [T, U] => [named.t, named.u]);
  expectTypeOf(namedOnlyGeneric).toEqualTypeOf<<T, U>(named: { t: T; u: U }) => [T, U]>();
  expectTypeOf(namedOnlyGeneric({ t: 'hi', u: 123 })).toEqualTypeOf<[string, number]>();

  let optionalNamed = resolve(<T, U>(a: T, named?: { cool: U }): [T, U] => [a, named?.cool as U]);
  expectTypeOf(optionalNamed).toEqualTypeOf<
    <T, U>(named: GlintEmptyObject | { cool: T }, a: U) => [T, U]
  >();
  expectTypeOf(optionalNamed({}, 123)).toEqualTypeOf<[number, unknown]>();
  expectTypeOf(optionalNamed({ cool: true }, 123)).toEqualTypeOf<[number, boolean]>();

  let optionalBoth = resolve(<T, U, V>(a: T, b?: U, named?: { foo: V }): [T, U, V] => [
    a,
    b as U,
    named?.foo as V,
  ]);
  expectTypeOf(optionalBoth).toEqualTypeOf<
    <T, U, V>(named: GlintEmptyObject | { foo: V }, a: T, b?: U) => [T, U, V]
  >();
  expectTypeOf(optionalBoth({}, 'hi')).toEqualTypeOf<[string, unknown, unknown]>();
  expectTypeOf(optionalBoth({}, 'hi', 123)).toEqualTypeOf<[string, number, unknown]>();
  expectTypeOf(optionalBoth({ foo: true }, 'hi')).toEqualTypeOf<[string, unknown, boolean]>();
  expectTypeOf(optionalBoth({ foo: true }, 'hi', 123)).toEqualTypeOf<[string, number, boolean]>();

  interface NamedInterface {
    name: string;
  }
  let namedArgsInterface = resolve((pos: string, options: NamedInterface) => {
    console.log(pos, options);
  });
  expectTypeOf(namedArgsInterface).toEqualTypeOf<
    (named: GlintEmptyObject, pos: string, options: NamedInterface) => void
  >();

  type NamedType = { name: string };
  let namedArgsType = resolve((pos: string, named: NamedType) => {
    console.log(pos, named);
  });
  expectTypeOf(namedArgsType).toEqualTypeOf<(named: NamedType, pos: string) => void>();

  let narrowsFirstArg = resolve(
    <K extends string>(arg: unknown, key: K): arg is Record<K, number> => !!key
  );
  expectTypeOf(narrowsFirstArg).toEqualTypeOf<
    <K extends string>(named: GlintEmptyObject, arg: unknown, key: K) => arg is Record<K, number>
  >();

  let narrowsFirstArgTestValue!: unknown;
  if (narrowsFirstArg({}, narrowsFirstArgTestValue, 'key')) {
    expectTypeOf(narrowsFirstArgTestValue.key).toBeNumber();
  }

  let allOptional = resolve((a?: string, b?: { foo: string }) => `${a}${b?.foo}`);
  expectTypeOf(allOptional).toEqualTypeOf<
    (named: GlintEmptyObject | { foo: string }, a?: string) => string
  >();
}
