import UpstreamEmberHelper from '@ember/component/helper';
import Helper, { helper } from '@glint/environment-ember-loose/ember-component/helper';
import { resolve } from '@glint/environment-ember-loose/-private/dsl';
import { expectTypeOf } from 'expect-type';
import { EmptyObject } from '@glint/template/-private/integration';

// Our `Helper` reexport should inherit static members
expectTypeOf(Helper.extend).toEqualTypeOf(UpstreamEmberHelper.extend);

// Functional helper: positional params
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
  expectTypeOf(or({}, 'a', true)).toEqualTypeOf<string | boolean>();
  expectTypeOf(or({}, false, true)).toEqualTypeOf<boolean>();
}

// Functional helper: named params
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
  class RepeatHelper<T> extends Helper<{ NamedArgs: RepeatArgs<T>; Return: Array<T> }> {
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

  type InferSignature<T> = T extends Helper<infer Signature> ? Signature : never;
  expectTypeOf<InferSignature<RepeatHelper<number>>>().toEqualTypeOf<{
    NamedArgs: RepeatArgs<number>;
    Return: Array<number>;
  }>();
}

// Class-based helper: positional args
{
  type RepeatArgs<T> = [value: T, count?: number | undefined];
  class RepeatHelper<T> extends Helper<{ PositionalArgs: RepeatArgs<T>; Return: Array<T> }> {
    override compute([value, count]: RepeatArgs<T>): Array<T> {
      return Array.from({ length: count ?? 2 }, () => value);
    }
  }

  let repeat = resolve(RepeatHelper);

  expectTypeOf(repeat).toEqualTypeOf<{
    <T>(args: EmptyObject, value: T, count?: number | undefined): Array<T>;
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

  expectTypeOf(maybeString).toEqualTypeOf<(args: EmptyObject) => string | undefined>();
}
