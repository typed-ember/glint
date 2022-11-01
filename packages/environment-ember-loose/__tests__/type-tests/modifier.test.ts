import Modifier, { modifier } from 'ember-modifier';
import { resolve } from '@glint/environment-ember-loose/-private/dsl';
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

  let neat = resolve(NeatModifier);

  expectTypeOf(neat({}, 'hello')).toEqualTypeOf<ModifierReturn<HTMLImageElement>>();
  expectTypeOf(neat({ multiplier: 3 }, 'hello')).toEqualTypeOf<ModifierReturn<HTMLImageElement>>();

  type InferSignature<T> = T extends Modifier<infer Signature> ? Signature : never;
  expectTypeOf<InferSignature<NeatModifier>>().toEqualTypeOf<NeatModifierSignature>();

  // @ts-expect-error: missing required positional arg
  neat({});

  // @ts-expect-error: extra positional arg
  neat({}, 'hello', 'goodbye');

  // @ts-expect-error: invalid type for named arg
  neat({ multiplier: 'hi' }, 'message');

  // @ts-expect-error: invalid named arg
  neat({ hello: 123 }, 'message');
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

  let neat = resolve(definition);

  expectTypeOf(neat({}, 'hello')).toEqualTypeOf<ModifierReturn<HTMLAudioElement>>();
  expectTypeOf(neat({ multiplier: 3 }, 'hello')).toEqualTypeOf<ModifierReturn<HTMLAudioElement>>();

  // @ts-expect-error: missing required positional arg
  neat({});

  // @ts-expect-error: extra positional arg
  neat({}, 'hello', 'goodbye');

  // @ts-expect-error: invalid type for named arg
  neat({ multiplier: 'hi' }, 'message');

  // @ts-expect-error: invalid named arg
  neat({ hello: 123 }, 'message');
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
