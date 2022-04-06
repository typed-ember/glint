import '@glint/environment-ember-loose/native-integration';
import { resolve } from '@glint/environment-ember-loose/-private/dsl';
import { expectTypeOf } from 'expect-type';
import { HelperLike, WithBoundArgs } from '@glint/template';
import { EmptyObject } from '../-private/integration';

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

// Generic params
{
  interface GenericSignature<T, U> {
    Args: { Positional: [T, U] };
    Return: T | U;
  }

  let definition!: new <T, U>() => InstanceType<HelperLike<GenericSignature<T, U>>>;
  let or = resolve(definition);

  expectTypeOf(or).toEqualTypeOf<{ <T, U>(args: EmptyObject, t: T, u: U): T | U }>();

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

// With bound args
{
  interface InfoSignature {
    Args: { Named: { age: number; name: string } };
    Return: string;
  }

  let definition!: WithBoundArgs<HelperLike<InfoSignature>, 'name'>;

  expectTypeOf(resolve(definition)).toEqualTypeOf<
    (args: { age: number; name?: string }) => string
  >();
}
