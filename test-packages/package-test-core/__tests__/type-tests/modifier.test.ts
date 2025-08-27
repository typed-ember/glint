import { registerDestructor } from '@ember/destroyable';
import type Owner from '@ember/owner';
import { NamedArgsMarker, resolve } from '@glint/core/-private/dsl';
import { ModifierLike } from '@glint/template';
import { ModifierReturn } from '@glint/template/-private/integration';
import Modifier, { modifier, type ArgsFor } from 'ember-modifier';
import { expectTypeOf } from 'expect-type';

// Class-based modifier
{
  interface NeatModifierSignature {
    Args: {
      Named: { multiplier?: number };
      Positional: [input: string];
    };
    Element: HTMLImageElement;
  }

  class NeatModifier extends Modifier<NeatModifierSignature> {
    private interval?: number;
    private multiplier?: number;

    constructor(owner: Owner, args: ArgsFor<NeatModifierSignature>) {
      super(owner, args);

      registerDestructor(this, () => window.clearInterval(this.interval));
    }

    override modify(
      element: HTMLImageElement,
      [input]: NeatModifierSignature['Args']['Positional'],
      { multiplier }: NeatModifierSignature['Args']['Named'],
    ): void {
      // expectTypeOf(element).toEqualTypeOf<HTMLImageElement>();
      this.multiplier = multiplier ?? 1000;
      const lengthOfInput = input.length;

      window.clearInterval(this.interval);
      this.interval = window.setInterval(() => {
        alert('this is a typesafe modifier!');
      }, this.multiplier * lengthOfInput);
    }
  }

  let img = new HTMLImageElement();
  let neat = resolve(NeatModifier);

  expectTypeOf(neat(img, 'hello')).toEqualTypeOf<ModifierReturn>();
  expectTypeOf(
    neat(img, 'hello', { multiplier: 3, ...NamedArgsMarker }),
  ).toEqualTypeOf<ModifierReturn>();

  neat(
    // @ts-expect-error: invalid element type
    new HTMLDivElement(),
    'hello',
  );

  // @ts-expect-error: missing required positional arg
  neat(img);

  neat(
    img,
    'hello',
    // @ts-expect-error: extra positional arg
    'goodbye',
  );

  neat(img, 'message', {
    // @ts-expect-error: invalid type for named arg
    multiplier: 'hi',
    ...NamedArgsMarker,
  });

  neat(img, 'message', {
    // @ts-expect-error: invalid named arg
    hello: 123,
    ...NamedArgsMarker,
  });
}

// Function-based modifier
{
  let definition = modifier(
    (element: HTMLAudioElement, [input]: [string], { multiplier }: { multiplier?: number }) => {
      let interval = window.setInterval(
        () => {
          alert('this is a typesafe modifier!');
        },
        input.length * (multiplier ?? 1000),
      );

      return () => window.clearInterval(interval);
    },
  );

  let audio = new HTMLAudioElement();
  let neat = resolve(definition);

  expectTypeOf(neat(audio, 'hello')).toEqualTypeOf<ModifierReturn>();
  expectTypeOf(
    neat(audio, 'hello', { multiplier: 3, ...NamedArgsMarker }),
  ).toEqualTypeOf<ModifierReturn>();

  neat(
    // @ts-expect-error: invalid element type
    new HTMLDivElement(),
    'hello',
  );

  // @ts-expect-error: missing required positional arg
  neat(audio);

  neat(
    audio,
    'hello',
    // @ts-expect-error: extra positional arg
    'goodbye',
  );

  neat(audio, 'message', {
    // @ts-expect-error: invalid type for named arg
    multiplier: 'hi',
    ...NamedArgsMarker,
  });

  neat(audio, 'message', {
    // @ts-expect-error: invalid named arg
    hello: 123,
    ...NamedArgsMarker,
  });
}

// Modifiers are `ModifierLike`
{
  interface TestSignature {
    Args: {
      Named: { count: number };
      Positional: [value: string];
    };
    Element: HTMLCanvasElement;
  }

  class MyModifier extends Modifier<TestSignature> {}
  const myModifier = modifier<TestSignature>(() => {});

  expectTypeOf(MyModifier).toExtend<ModifierLike<TestSignature>>();
  expectTypeOf(myModifier).toExtend<ModifierLike<TestSignature>>();
}
