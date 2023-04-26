import Helper, { helper } from '@ember/component/helper';
import { resolve, NamedArgsMarker } from '@glint/environment-ember-loose/-private/dsl';
import { expectTypeOf } from 'expect-type';
import { HelperLike } from '@glint/template';
import { NamedArgs } from '@glint/template/-private/integration';

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

  expectTypeOf(info).toEqualTypeOf<(name: string, named: NamedArgs<{ age: number }>) => string>();

  info(
    // @ts-expect-error: missing named arg
    {},
    'Tom'
  );

  info('Tom', {
    age: 123,
    // @ts-expect-error: extra named arg
    hello: true,
    ...NamedArgsMarker,
  });

  // @ts-expect-error: missing positional arg
  info({ age: 123, ...NamedArgsMarker });

  info(
    'Tom',
    'Ster',
    // @ts-expect-error: extra positional arg
    { age: 123, ...NamedArgsMarker }
  );

  expectTypeOf(info('Tom', { age: 123, ...NamedArgsMarker })).toEqualTypeOf<string>();
}

// Functional helper: generic positional params
{
  let definition = helper(<T, U>([a, b]: [T, U]) => a || b);
  let or = resolve(definition);

  // Using `toMatch` rather than `toEqual` because helper resolution (currently)
  // uses a special `EmptyObject` type to represent empty named args.
  expectTypeOf(or).toMatchTypeOf<{ <T, U>(t: T, u: U, named?: NamedArgs<{}>): T | U }>();

  or('a', 'b', {
    // @ts-expect-error: extra named arg
    hello: true,
    ...NamedArgsMarker,
  });

  // This is perhaps unexpected, but this will typecheck with the named args acting
  // as the second positional argument.
  expectTypeOf(or('a' as const, { foo: 'hi', ...NamedArgsMarker })).toEqualTypeOf<
    'a' | NamedArgs<{ foo: string }>
  >();

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

// Functional helper: generic named params
{
  let definition = helper(<T>(_: [], { value, count }: { value: T; count?: number }) => {
    return Array.from({ length: count ?? 2 }, () => value);
  });

  let repeat = resolve(definition);

  expectTypeOf(repeat).toEqualTypeOf<{
    <T>(args: NamedArgs<{ value: T; count?: number }>): Array<T>;
  }>();

  // @ts-expect-error: extra positional arg
  repeat(123, { word: 'hi', ...NamedArgsMarker });

  // @ts-expect-error: missing required named arg
  repeat({ count: 3, ...NamedArgsMarker });

  repeat({
    // @ts-expect-error: extra named arg
    word: 'hello',
    foo: true,
    ...NamedArgsMarker,
  });

  expectTypeOf(repeat({ value: 'hi', ...NamedArgsMarker })).toEqualTypeOf<Array<string>>();
  expectTypeOf(repeat({ value: 123, count: 3, ...NamedArgsMarker })).toEqualTypeOf<Array<number>>();
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

  expectTypeOf(repeat).toEqualTypeOf<{
    <T>(args: NamedArgs<{ value: T; count?: number }>): Array<T>;
  }>();

  repeat(
    123,
    // @ts-expect-error: extra positional arg
    { word: 'hi', ...NamedArgsMarker }
  );

  // @ts-expect-error: missing required named arg
  repeat({ count: 3, ...NamedArgsMarker });

  repeat({
    value: 'hello',
    // @ts-expect-error: extra named arg
    foo: true,
    ...NamedArgsMarker,
  });

  expectTypeOf(repeat({ value: 'hi', ...NamedArgsMarker })).toEqualTypeOf<Array<string>>();
  expectTypeOf(repeat({ value: 123, count: 3, ...NamedArgsMarker })).toEqualTypeOf<Array<number>>();
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
    <T>(value: T, count?: number | undefined): Array<T>;
  }>();

  repeat(
    'hello',
    // @ts-expect-error: unexpected named args
    { word: 'hi', ...NamedArgsMarker }
  );

  repeat(
    'hello',
    123,
    // @ts-expect-error: extra positional arg in named args spot
    'hi'
  );

  expectTypeOf(repeat('hi')).toEqualTypeOf<Array<string>>();
  expectTypeOf(repeat(123, 3)).toEqualTypeOf<Array<number>>();
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

  expectTypeOf(maybeString).toEqualTypeOf<() => string | undefined>();
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
  let positionalOnlyConcrete = resolve((a: number, b: number) => a + b);
  expectTypeOf(positionalOnlyConcrete).toEqualTypeOf<(a: number, b: number) => number>();
  expectTypeOf(positionalOnlyConcrete(1, 2)).toBeNumber();

  let positionalOnlyGeneric = resolve(<A, B>(a: A, b: B): [A, B] => [a, b]);
  expectTypeOf(positionalOnlyGeneric).toEqualTypeOf<<A, B>(a: A, b: B) => [A, B]>();
  expectTypeOf(positionalOnlyGeneric('hi', true)).toEqualTypeOf<[string, boolean]>();
  expectTypeOf(positionalOnlyGeneric(123, Symbol())).toEqualTypeOf<[number, symbol]>();

  let mixedConcrete = resolve(
    (a: number, b: number, named: { fallback: number }) => named.fallback
  );
  expectTypeOf(mixedConcrete).toEqualTypeOf<
    (a: number, b: number, named: { fallback: number }) => number
  >();
  expectTypeOf(mixedConcrete(1, 2, { fallback: 123 })).toBeNumber();

  let mixedGenericNamed = resolve(
    <T>(a: number, b: number, named: { fallback: T }) => a + b || named.fallback
  );
  expectTypeOf(mixedGenericNamed).toEqualTypeOf<
    <T>(a: number, b: number, named: { fallback: T }) => T | number
  >();
  expectTypeOf(mixedGenericNamed(1, 2, { fallback: 'hi' })).toEqualTypeOf<number | string>();
  expectTypeOf(mixedGenericNamed(1, 2, { fallback: 3 })).toBeNumber();

  let mixedGenericPositional = resolve(
    <T>(a: T, b: T, named: { fallback: string }): string | T => a || b || named.fallback
  );
  expectTypeOf(mixedGenericPositional).toEqualTypeOf<
    <T>(a: T, b: T, named: { fallback: string }) => T | string
  >();
  expectTypeOf(mixedGenericPositional('a', 'b', { fallback: 'hi' })).toBeString();
  expectTypeOf(mixedGenericPositional(1, 2, { fallback: 'hi' })).toEqualTypeOf<string | number>();
  mixedGenericPositional(
    'a',
    // @ts-expect-error: inconsistent T
    123,
    { fallback: 'hi' }
  );

  let mixedGeneric = resolve(<A, B, C>(a: A, b: B, named: { c: C }): [A, B, C] => [a, b, named.c]);
  expectTypeOf(mixedGeneric).toEqualTypeOf<<A, B, C>(a: A, b: B, named: { c: C }) => [A, B, C]>();
  expectTypeOf(mixedGeneric(123, false, { c: 'hi' })).toEqualTypeOf<[number, boolean, string]>();

  let namedOnlyConcrete = resolve((named: { age: number; name: string }) => named.name);
  expectTypeOf(namedOnlyConcrete).toEqualTypeOf<(named: { age: number; name: string }) => string>();
  expectTypeOf(namedOnlyConcrete({ age: 100, name: 'Alex' })).toBeString();

  let namedOnlyGeneric = resolve(<T, U>(named: { t: T; u: U }): [T, U] => [named.t, named.u]);
  expectTypeOf(namedOnlyGeneric).toEqualTypeOf<<T, U>(named: { t: T; u: U }) => [T, U]>();
  expectTypeOf(namedOnlyGeneric({ t: 'hi', u: 123 })).toEqualTypeOf<[string, number]>();

  let optionalNamed = resolve(<T, U>(a: T, named?: { cool: U }): [T, U] => [a, named?.cool as U]);
  expectTypeOf(optionalNamed).toEqualTypeOf<<T, U>(a: U, named?: { cool: T }) => [T, U]>();
  expectTypeOf(optionalNamed(123)).toEqualTypeOf<[number, unknown]>();
  expectTypeOf(optionalNamed(123, { cool: true, ...NamedArgsMarker })).toEqualTypeOf<
    [number, boolean]
  >();

  let optionalBoth = resolve(<T, U, V>(a: T, b?: U, named?: { foo: V }): [T, U, V] => [
    a,
    b as U,
    named?.foo as V,
  ]);
  expectTypeOf(optionalBoth).toEqualTypeOf<
    <T, U, V>(a: T, b?: U, named?: { foo: V }) => [T, U, V]
  >();
  expectTypeOf(optionalBoth('hi')).toEqualTypeOf<[string, unknown, unknown]>();
  expectTypeOf(optionalBoth('hi', 123)).toEqualTypeOf<[string, number, unknown]>();
  expectTypeOf(optionalBoth('hi', undefined, { foo: true, ...NamedArgsMarker })).toEqualTypeOf<
    [string, undefined, boolean]
  >();
  expectTypeOf(optionalBoth('hi', 123, { foo: true, ...NamedArgsMarker })).toEqualTypeOf<
    [string, number, boolean]
  >();

  interface NamedInterface {
    name: string;
  }
  let namedArgsInterface = resolve((pos: string, options: NamedInterface) => {
    console.log(pos, options);
  });
  expectTypeOf(namedArgsInterface).toEqualTypeOf<(pos: string, options: NamedInterface) => void>();

  type NamedType = { name: string };
  let namedArgsType = resolve((pos: string, named: NamedType) => {
    console.log(pos, named);
  });
  expectTypeOf(namedArgsType).toEqualTypeOf<(pos: string, named: NamedType) => void>();

  let narrowsFirstArg = resolve(
    <K extends string>(arg: unknown, key: K): arg is Record<K, number> => !!key
  );
  expectTypeOf(narrowsFirstArg).toEqualTypeOf<
    <K extends string>(arg: unknown, key: K) => arg is Record<K, number>
  >();

  let narrowsFirstArgTestValue!: unknown;
  if (narrowsFirstArg(narrowsFirstArgTestValue, 'key')) {
    expectTypeOf(narrowsFirstArgTestValue.key).toBeNumber();
  }

  let allOptional = resolve((a?: string, b?: { foo: string }) => `${a}${b?.foo}`);
  expectTypeOf(allOptional).toEqualTypeOf<(a?: string, b?: { foo: string }) => string>();
}
