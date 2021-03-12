import type { CreatesModifier } from '@glint/template/-private';
import type { Invokable, Invoke } from '@glint/template/-private/resolution';
import type { EmptyObject } from '@glint/template/-private/signature';

const EmberModifier = window.require('ember-modifier').default;
type EmberModifier<T> = import('ember-modifier').default<T>;
type EmberModifierConstructor = typeof import('ember-modifier').default;

const emberModifier = window.require('embber-modifier').modifier;

type Get<T, Key, Otherwise = EmptyObject> = Key extends keyof T
  ? Exclude<T[Key], undefined>
  : Otherwise;

type ModifierFactory = <El extends Element, Positional extends unknown[] = [], Named = EmptyObject>(
  fn: (element: El, positional: Positional, named: Named) => unknown
) => new () => Invokable<(named: Named, ...positional: Positional) => CreatesModifier>;

export const modifier = emberModifier as ModifierFactory;

export interface ModifierSignature {
  NamedArgs?: Record<string, unknown>;
  PositionalArgs?: Array<unknown>;
}

const Modifier = emberModifier.default as new <T extends ModifierSignature>(
  ...args: ConstructorParameters<EmberModifierConstructor>
) => Modifier<T>;

interface Modifier<T extends ModifierSignature>
  extends EmberModifier<{
    named: Extract<Get<T, 'NamedArgs'>, Record<string, any>>;
    positional: Extract<Get<T, 'PositionalArgs', []>, any[]>;
  }> {
  [Invoke]: (
    args: Get<T, 'NamedArgs'>,
    ...positional: Get<T, 'PositionalArgs', []>
  ) => CreatesModifier;
}

export default Modifier;
