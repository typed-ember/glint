import { NamedArgsMarker, resolve } from '@glint/environment-ember-loose/-private/dsl';
import { expectTypeOf } from 'expect-type';
import { ModifierReturn, NamedArgs } from '@glint/template/-private/integration';
import { ModifierLike, WithBoundArgs, WithBoundPositionals } from '@glint/template';

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
  let el = new HTMLImageElement();

  expectTypeOf(neat(el, 'hello')).toEqualTypeOf<ModifierReturn>();
  expectTypeOf(
    neat(el, 'hello', { multiplier: 3, ...NamedArgsMarker }),
  ).toEqualTypeOf<ModifierReturn>();

  // @ts-expect-error: missing required positional arg
  neat(el);

  neat(
    el,
    'hello',
    // @ts-expect-error: extra positional arg
    'goodbye',
  );

  neat(el, 'message', {
    // @ts-expect-error: invalid type for named arg
    multiplier: 'hi',
    ...NamedArgsMarker,
  });

  neat(el, 'message', {
    // @ts-expect-error: invalid named arg
    hello: 123,
    ...NamedArgsMarker,
  });
}

// Unions of arg types
{
  interface UnionSignature {
    Element: HTMLAudioElement;
    Args: {
      Positional: [full: string] | [first: string, last: string];
      Named: { force: boolean } | Partial<{ foo: string; bar: string }>;
    };
  }

  let definition!: ModifierLike<UnionSignature>;
  let info = resolve(definition);

  expectTypeOf(info).toEqualTypeOf<
    (
      ...args:
        | [element: HTMLAudioElement, full: string, named: NamedArgs<{ force: boolean }>]
        | [
            element: HTMLAudioElement,
            full: string,
            named?: NamedArgs<Partial<{ foo: string; bar: string }>>,
          ]
        | [
            element: HTMLAudioElement,
            first: string,
            last: string,
            named: NamedArgs<{ force: boolean }>,
          ]
        | [
            element: HTMLAudioElement,
            first: string,
            last: string,
            named?: NamedArgs<Partial<{ foo: string; bar: string }>>,
          ]
    ) => ModifierReturn
  >();
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
  let el = new HTMLCanvasElement();

  expectTypeOf(
    onDestroy(el, (value) => value.charAt(0), { value: 'hello', ...NamedArgsMarker }),
  ).toEqualTypeOf<ModifierReturn>();

  // @ts-expect-error: missing required positional arg
  onDestroy(el, { value: 'hi', ...NamedArgsMarker });

  onDestroy(
    el,
    'hello',
    'goodbye',
    // @ts-expect-error: extra positional arg
    { value: 'hi', ...NamedArgsMarker },
  );

  onDestroy(el, (value: string) => value.length, {
    // @ts-expect-error: mismatched arg types
    value: 123,
    ...NamedArgsMarker,
  });
}

// With bound args
{
  interface NeatModifierSignature {
    Args: { Named: { multiplier: number; input: string } };
    Element: HTMLImageElement;
  }

  let NeatModifier!: WithBoundArgs<ModifierLike<NeatModifierSignature>, 'multiplier'>;

  expectTypeOf(resolve(NeatModifier)).toExtend<
    (
      el: HTMLImageElement,
      args: NamedArgs<{ multiplier?: number; input: string }>,
    ) => ModifierReturn
  >();
}

// With bound positionals
{
  interface NeatModifierSignature {
    Args: { Positional: [multiplier: number, input: string] };
    Element: HTMLImageElement;
  }

  let NeatModifier!: WithBoundPositionals<ModifierLike<NeatModifierSignature>, 1>;

  expectTypeOf(resolve(NeatModifier)).toEqualTypeOf<
    (el: HTMLImageElement, input: string) => ModifierReturn
  >();
}

// Assignability
{
  // Modifiers are contravariant with their named `Args` type
  expectTypeOf<ModifierLike<{ Args: { Named: { name: string } } }>>().toMatchTypeOf<
    ModifierLike<{ Args: { Named: { name: 'Dan' } } }>
  >();
  expectTypeOf<ModifierLike<{ Args: { Named: { name: 'Dan' } } }>>().not.toMatchTypeOf<
    ModifierLike<{ Args: { Named: { name: string } } }>
  >();

  // Modifiers are contravariant with their positional `Args` type
  expectTypeOf<ModifierLike<{ Args: { Positional: [name: string] } }>>().toMatchTypeOf<
    ModifierLike<{ Args: { Positional: [name: 'Dan'] } }>
  >();
  expectTypeOf<ModifierLike<{ Args: { Positional: [name: 'Dan'] } }>>().not.toMatchTypeOf<
    ModifierLike<{ Args: { Positional: [name: string] } }>
  >();

  // Modifiers are contravariant with their `Element` type
  expectTypeOf<ModifierLike<{ Element: HTMLElement }>>().toMatchTypeOf<
    ModifierLike<{ Element: HTMLAudioElement }>
  >();
  expectTypeOf<ModifierLike<{ Element: HTMLAudioElement }>>().not.toMatchTypeOf<
    ModifierLike<{ Element: HTMLElement }>
  >();
}
