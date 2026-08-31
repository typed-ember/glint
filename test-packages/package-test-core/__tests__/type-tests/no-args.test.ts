import EmberComponent from '@ember/component';
import Helper, { helper } from '@ember/component/helper';
import { emitComponent, NamedArgsMarker, resolve } from '@glint/ember-tsc/-private/dsl';
import { ComponentLike, HelperLike, ModifierLike, NoArgs } from '@glint/template';
import { NamedArgs } from '@glint/template/-private/integration';
import GlimmerComponent from '@glimmer/component';
import Modifier, { modifier } from 'ember-modifier';
import { expectTypeOf } from 'expect-type';

import '@glint/ember-tsc/types';

declare function value<T>(): T;

// Glimmer component
{
  class NoArgsGlimmer extends GlimmerComponent<{ Args: NoArgs }> {}

  const component = resolve(NoArgsGlimmer);

  expectTypeOf(component).parameters.toEqualTypeOf<[named?: NamedArgs<Record<string, never>>]>();
  expectTypeOf(NoArgsGlimmer).toExtend<ComponentLike<{ Args: NoArgs }>>();

  emitComponent(component());
  emitComponent(component({ ...NamedArgsMarker }));
  component(
    // @ts-expect-error: no named args are accepted
    { anything: true, ...NamedArgsMarker },
  );
  component(
    // @ts-expect-error: no positional args are accepted
    'oops',
  );
}

// Ember (classic) component
{
  class NoArgsEmber extends EmberComponent<{ Args: NoArgs }> {}

  const component = resolve(NoArgsEmber);

  expectTypeOf(component).parameters.toEqualTypeOf<[named?: NamedArgs<Record<string, never>>]>();
  expectTypeOf(NoArgsEmber).toExtend<ComponentLike<{ Args: NoArgs }>>();

  emitComponent(component());
  component(
    // @ts-expect-error: no named args are accepted
    { anything: true, ...NamedArgsMarker },
  );
  component(
    // @ts-expect-error: no positional args are accepted
    'oops',
  );
}

// Plain function helper
{
  const plain = (): string => 'hi';

  const helperFn = resolve(plain);

  expectTypeOf(helperFn()).toEqualTypeOf<string>();
  // A zero-arg function is usable wherever a NoArgs helper's resolved
  // signature is expected.
  expectTypeOf(plain).toExtend<(named?: NamedArgs<Record<string, never>>) => string>();
}

// helper()
{
  const definition = helper<{ Args: NoArgs; Return: number }>(() => 123);

  const info = resolve(definition);

  expectTypeOf(info).parameters.toEqualTypeOf<[named?: NamedArgs<Record<string, never>>]>();
  expectTypeOf(info()).toEqualTypeOf<number>();
  expectTypeOf(definition).toExtend<HelperLike<{ Args: NoArgs; Return: number }>>();

  info(
    // @ts-expect-error: no named args are accepted
    { anything: true, ...NamedArgsMarker },
  );
  info(
    // @ts-expect-error: no positional args are accepted
    'oops',
  );
}

// Class-based helper
{
  class NoArgsHelper extends Helper<{ Args: NoArgs; Return: number }> {
    override compute(): number {
      return 123;
    }
  }

  const info = resolve(NoArgsHelper);

  expectTypeOf(info).parameters.toEqualTypeOf<[named?: NamedArgs<Record<string, never>>]>();
  expectTypeOf(info()).toEqualTypeOf<number>();
  expectTypeOf(NoArgsHelper).toExtend<HelperLike<{ Args: NoArgs; Return: number }>>();

  info(
    // @ts-expect-error: no named args are accepted
    { anything: true, ...NamedArgsMarker },
  );
  info(
    // @ts-expect-error: no positional args are accepted
    'oops',
  );
}

// Class-based modifier
{
  class NoArgsModifier extends Modifier<{ Args: NoArgs; Element: HTMLImageElement }> {
    override modify(element: HTMLImageElement): void {
      element;
    }
  }

  const attach = resolve(NoArgsModifier);

  expectTypeOf(attach).parameters.toEqualTypeOf<
    [element: HTMLImageElement, named?: NamedArgs<Record<string, never>>]
  >();
  expectTypeOf(NoArgsModifier).toExtend<
    ModifierLike<{ Args: NoArgs; Element: HTMLImageElement }>
  >();

  attach(value<HTMLImageElement>());
  attach(
    value<HTMLImageElement>(),
    // @ts-expect-error: no named args are accepted
    { anything: true, ...NamedArgsMarker },
  );
  attach(
    value<HTMLImageElement>(),
    // @ts-expect-error: no positional args are accepted
    'oops',
  );
}

// Function-based modifier
{
  const definition = modifier<{ Args: NoArgs; Element: HTMLAudioElement }>((element) => {
    element;
  });

  const attach = resolve(definition);

  expectTypeOf(attach).parameters.toEqualTypeOf<
    [element: HTMLAudioElement, named?: NamedArgs<Record<string, never>>]
  >();
  expectTypeOf(definition).toExtend<ModifierLike<{ Args: NoArgs; Element: HTMLAudioElement }>>();

  attach(value<HTMLAudioElement>());
  attach(
    value<HTMLAudioElement>(),
    // @ts-expect-error: no named args are accepted
    { anything: true, ...NamedArgsMarker },
  );
  attach(
    value<HTMLAudioElement>(),
    // @ts-expect-error: no positional args are accepted
    'oops',
  );
}
