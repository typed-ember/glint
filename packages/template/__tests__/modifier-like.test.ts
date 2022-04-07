import '@glint/environment-ember-loose/native-integration';
import { resolve } from '@glint/environment-ember-loose/-private/dsl';
import { expectTypeOf } from 'expect-type';
import { BoundModifier } from '@glint/template/-private/integration';
import { ModifierLike, WithBoundArgs } from '@glint/template';

// Fixed signature params
{
  interface NeatModifierSignature {
    Args: {
      Named: { multiplier?: number };
      Positional: [input: string];
    };
    Element: HTMLImageElement;
  }

  let NeatModifier!: ModifierLike<NeatModifierSignature>;
  let neat = resolve(NeatModifier);

  expectTypeOf(neat({}, 'hello')).toEqualTypeOf<BoundModifier<HTMLImageElement>>();
  expectTypeOf(neat({ multiplier: 3 }, 'hello')).toEqualTypeOf<BoundModifier<HTMLImageElement>>();

  // @ts-expect-error: missing required positional arg
  neat({});

  // @ts-expect-error: extra positional arg
  neat({}, 'hello', 'goodbye');

  // @ts-expect-error: invalid type for named arg
  neat({ multiplier: 'hi' }, 'message');

  // @ts-expect-error: invalid named arg
  neat({ hello: 123 }, 'message');
}

// Generic params
{
  interface OnDestroySignature<T> {
    Args: {
      Named: { value: T };
      Positional: [(value: T) => void];
    };
    Element: HTMLCanvasElement;
  }
  let definition!: new <T>() => InstanceType<ModifierLike<OnDestroySignature<T>>>;
  let onDestroy = resolve(definition);

  expectTypeOf(onDestroy({ value: 'hello' }, (value) => value.charAt(0))).toEqualTypeOf<
    BoundModifier<HTMLCanvasElement>
  >();

  // @ts-expect-error: missing required positional arg
  onDestroy({ value: 'hi' });

  onDestroy(
    { value: 'hi' },
    'hello',
    // @ts-expect-error: extra positional arg
    'goodbye'
  );

  // @ts-expect-error: mismatched arg types
  onDestroy({ value: 123 }, (value: string) => value.length);
}

// With bound args
{
  interface NeatModifierSignature {
    Args: { Named: { multiplier: number; input: string } };
    Element: HTMLImageElement;
  }

  let NeatModifier!: WithBoundArgs<ModifierLike<NeatModifierSignature>, 'multiplier'>;

  expectTypeOf(resolve(NeatModifier)).toEqualTypeOf<
    (args: { multiplier?: number; input: string }) => BoundModifier<HTMLImageElement>
  >();
}
