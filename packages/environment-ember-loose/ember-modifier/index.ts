import type {
  Invokable,
  Invoke,
  BoundModifier,
  EmptyObject,
} from '@glint/template/-private/integration';

const EmberModifier = window.require('ember-modifier').default;
type EmberModifier<T> = import('ember-modifier').default<T>;
type EmberModifierConstructor = typeof import('ember-modifier').default;

const emberModifier = window.require('ember-modifier').modifier;

type Get<T, Key, Otherwise = EmptyObject> = Key extends keyof T
  ? Exclude<T[Key], undefined>
  : Otherwise;

type ModifierFactory = <El extends Element, Positional extends unknown[] = [], Named = EmptyObject>(
  fn: (element: El, positional: Positional, named: Named) => unknown
) => new () => Invokable<(named: Named, ...positional: Positional) => BoundModifier<El>>;

export const modifier = emberModifier as ModifierFactory;

export interface ModifierSignature {
  NamedArgs?: Record<string, unknown>;
  PositionalArgs?: Array<unknown>;
  Element?: Element;
}

const Modifier = emberModifier.default as new <T extends ModifierSignature>(
  ...args: ConstructorParameters<EmberModifierConstructor>
) => Modifier<T>;

interface Modifier<T extends ModifierSignature>
  extends EmberModifier<{
    named: Extract<Get<T, 'NamedArgs'>, Record<string, any>>;
    positional: Extract<Get<T, 'PositionalArgs', []>, any[]>;
  }> {
  readonly element: Get<T, 'Element', Element>;
  [Invoke]: (
    args: Get<T, 'NamedArgs'>,
    ...positional: Get<T, 'PositionalArgs', []>
  ) => BoundModifier<this['element']>;
}

export default Modifier;
