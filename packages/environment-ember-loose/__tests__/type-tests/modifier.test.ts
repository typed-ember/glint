import Modifier, { modifier } from '@glint/environment-ember-loose/ember-modifier';
import { resolve } from '@glint/environment-ember-loose/-private/dsl';
import { expectTypeOf } from 'expect-type';
import { BoundModifier } from '@glint/template/-private/integration';

// Class-based modifier
{
  interface NeatModifierSignature {
    NamedArgs: { multiplier?: number };
    PositionalArgs: [input: string];
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

  expectTypeOf(neat({}, 'hello')).toEqualTypeOf<BoundModifier<HTMLImageElement>>();
  expectTypeOf(neat({ multiplier: 3 }, 'hello')).toEqualTypeOf<BoundModifier<HTMLImageElement>>();

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

  expectTypeOf(neat({}, 'hello')).toEqualTypeOf<BoundModifier<HTMLAudioElement>>();
  expectTypeOf(neat({ multiplier: 3 }, 'hello')).toEqualTypeOf<BoundModifier<HTMLAudioElement>>();

  // @ts-expect-error: missing required positional arg
  neat({});

  // @ts-expect-error: extra positional arg
  neat({}, 'hello', 'goodbye');

  // @ts-expect-error: invalid type for named arg
  neat({ multiplier: 'hi' }, 'message');

  // @ts-expect-error: invalid named arg
  neat({ hello: 123 }, 'message');
}
