import { NamedArgsMarker, resolve } from '@glint/environment-ember-loose/-private/dsl';
import { expectTypeOf } from 'expect-type';
import { HelperLike, WithBoundArgs, WithBoundPositionals } from '@glint/template';
import { NamedArgs } from '../-private/integration';

// Fixed signature params
{
  interface InfoSignature {
    Args: {
      Named: { age: number };
      Positional: [name: string];
    };
    Return: string;
  }

  let definition!: HelperLike<InfoSignature>;
  let info = resolve(definition);

  expectTypeOf(info).toEqualTypeOf<(name: string, named: NamedArgs<{ age: number }>) => string>();

  info(
    'Tom',
    // @ts-expect-error: missing named arg
    { ...NamedArgsMarker },
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
    { age: 123, ...NamedArgsMarker },
  );

  expectTypeOf(info('Tom', { age: 123, ...NamedArgsMarker })).toEqualTypeOf<string>();
}

// Unions of arg types
{
  interface UnionSignature {
    Args: {
      Positional: [full: string] | [first: string, last: string];
      Named: { force: boolean } | Partial<{ foo: string; bar: string }>;
    };
    Return: string;
  }

  let definition!: HelperLike<UnionSignature>;
  let info = resolve(definition);

  expectTypeOf(info).toEqualTypeOf<
    (
      ...args:
        | [full: string, named: NamedArgs<{ force: boolean }>]
        | [full: string, named?: NamedArgs<Partial<{ foo: string; bar: string }>>]
        | [first: string, last: string, named: NamedArgs<{ force: boolean }>]
        | [first: string, last: string, named?: NamedArgs<Partial<{ foo: string; bar: string }>>]
    ) => string
  >();
}

// Generic params
{
  interface GenericSignature<T, U> {
    Args: { Positional: [T, U] };
    Return: T | U;
  }

  let definition!: new <T, U>() => InstanceType<HelperLike<GenericSignature<T, U>>>;
  let or = resolve(definition);

  expectTypeOf(or).toEqualTypeOf<{ <T, U>(t: T, u: U): T | U }>();

  or(
    'a',
    'b',
    // @ts-expect-error: extra positional arg
    'c',
  );

  expectTypeOf(or('a', 'b')).toEqualTypeOf<string>();
  expectTypeOf(or('a', true)).toEqualTypeOf<string | boolean>();
  expectTypeOf(or(false, true)).toEqualTypeOf<boolean>();
}

// With bound args
{
  interface InfoSignature {
    Args: { Named: { age: number; name: string } };
    Return: string;
  }

  let definition!: WithBoundArgs<HelperLike<InfoSignature>, 'name'>;

  expectTypeOf(resolve(definition)).toEqualTypeOf<
    (args: NamedArgs<{ age: number; name?: string }>) => string
  >();
}

// With bound positionals
{
  interface InfoSignature {
    Args: { Positional: [age: number, name: string] };
    Return: string;
  }

  let definition!: WithBoundPositionals<HelperLike<InfoSignature>, 1>;

  expectTypeOf(resolve(definition)).toEqualTypeOf<(name: string) => string>();
}

// Assignability
{
  // Helpers are contravariant with their named `Args` type
  expectTypeOf<HelperLike<{ Args: { Named: { name: string } } }>>().toMatchTypeOf<
    HelperLike<{ Args: { Named: { name: 'Dan' } } }>
  >();
  expectTypeOf<HelperLike<{ Args: { Named: { name: 'Dan' } } }>>().not.toMatchTypeOf<
    HelperLike<{ Args: { Named: { name: string } } }>
  >();

  // Helpers are contravariant with their positional `Args` type
  expectTypeOf<HelperLike<{ Args: { Positional: [name: string] } }>>().toMatchTypeOf<
    HelperLike<{ Args: { Positional: [name: 'Dan'] } }>
  >();
  expectTypeOf<HelperLike<{ Args: { Positional: [name: 'Dan'] } }>>().not.toMatchTypeOf<
    HelperLike<{ Args: { Positional: [name: string] } }>
  >();

  // Helpers are contravariant with their `Element` type
  expectTypeOf<HelperLike<{ Return: 'Hello, World' }>>().toMatchTypeOf<
    HelperLike<{ Return: string }>
  >();
  expectTypeOf<HelperLike<{ Return: string }>>().not.toMatchTypeOf<
    HelperLike<{ Return: 'Hello, World' }>
  >();
}
