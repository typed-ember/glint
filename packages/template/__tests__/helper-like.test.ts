import { NamedArgsMarker, resolve } from '@glint/environment-ember-loose/-private/dsl';
import { expectTypeOf } from 'expect-type';
import { HelperLike, WithBoundArgs } from '@glint/template';
import { EmptyObject, NamedArgs } from '../-private/integration';

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
    { ...NamedArgsMarker }
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

// Generic params
{
  interface GenericSignature<T, U> {
    Args: { Positional: [T, U] };
    Return: T | U;
  }

  let definition!: new <T, U>() => InstanceType<HelperLike<GenericSignature<T, U>>>;
  let or = resolve(definition);

  expectTypeOf(or).toEqualTypeOf<{ <T, U>(t: T, u: U, args?: NamedArgs<EmptyObject>): T | U }>();

  or('a', 'b', {
    // @ts-expect-error: extra named arg
    hello: true,
    ...NamedArgsMarker,
  });

  or(
    'a',
    'b',
    'c',
    // @ts-expect-error: extra positional arg
    { ...NamedArgsMarker }
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
