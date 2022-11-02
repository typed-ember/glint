import Modifier, { modifier } from 'ember-modifier';
import { NamedArgsMarker, resolve } from '@glint/environment-ember-loose/-private/dsl';
import { expectTypeOf } from 'expect-type';
import { ModifierReturn } from '@glint/template/-private/integration';
import { ModifierLike } from '@glint/template';

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

    get lengthOfInput(): number {
      return this.args.positional[0].length;
    }

    get multiplier(): number {
      if (this.args.named.multiplier === undefined) {
        return 1000;
      }

      return this.args.named.multiplier;
    }

    override didReceiveArguments(): void {
      expectTypeOf(this.element).toEqualTypeOf<HTMLImageElement>();

      this.interval = window.setInterval(() => {
        alert('this is a typesafe modifier!');
      }, this.multiplier * this.lengthOfInput);
    }

    override willDestroy(): void {
      window.clearInterval(this.interval);
    }
  }

  let img = new HTMLImageElement();
  let neat = resolve(NeatModifier);

  expectTypeOf(neat(img, 'hello')).toEqualTypeOf<ModifierReturn>();
  expectTypeOf(
    neat(img, 'hello', { multiplier: 3, ...NamedArgsMarker })
  ).toEqualTypeOf<ModifierReturn>();

  neat(
    // @ts-expect-error: invalid element type
    new HTMLDivElement(),
    'hello'
  );

  type InferSignature<T> = T extends Modifier<infer Signature> ? Signature : never;
  expectTypeOf<InferSignature<NeatModifier>>().toEqualTypeOf<NeatModifierSignature>();

  // @ts-expect-error: missing required positional arg
  neat(img);

  neat(
    img,
    'hello',
    // @ts-expect-error: extra positional arg
    'goodbye'
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
      let interval = window.setInterval(() => {
        alert('this is a typesafe modifier!');
      }, input.length * (multiplier ?? 1000));

      return () => window.clearInterval(interval);
    }
  );

  let audio = new HTMLAudioElement();
  let neat = resolve(definition);

  expectTypeOf(neat(audio, 'hello')).toEqualTypeOf<ModifierReturn>();
  expectTypeOf(
    neat(audio, 'hello', { multiplier: 3, ...NamedArgsMarker })
  ).toEqualTypeOf<ModifierReturn>();

  neat(
    // @ts-expect-error: invalid element type
    new HTMLDivElement(),
    'hello'
  );

  // @ts-expect-error: missing required positional arg
  neat(audio);

  neat(
    audio,
    'hello',
    // @ts-expect-error: extra positional arg
    'goodbye'
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
  const myModifier = modifier<TestSignature>(() => {}, { eager: false });

  expectTypeOf(MyModifier).toMatchTypeOf<ModifierLike<TestSignature>>();
  expectTypeOf(myModifier).toMatchTypeOf<ModifierLike<TestSignature>>();
}
