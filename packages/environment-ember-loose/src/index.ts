// This module re-exports values from `@ember/component`, `@glimmer/component` and `ember-modifier`
// in a way that's compatible with glint types. It intentionally uses the `Ember` global and
// `window['require']` to avoid causing auto-import or Embroider to try and bundle those packages
// into the build.
// In the future we will hopefully be able to avoid this and have the upstream packages ship types
// that are, if not glint-aware, at least glint-compatible.

declare const Ember: any;

const emberComponent = {
  default: Ember.Component,
} as typeof import('@ember/component');

const emberComponentHelper = {
  default: Ember.Helper,
  helper: Ember.Helper.helper,
} as typeof import('@ember/component/helper');

const glimmerComponent = window['require'](
  '@glimmer/component'
) as typeof import('@glimmer/component');
const emberModifier = window['require']('ember-modifier') as typeof import('ember-modifier');

type emberModifierDefault<T> = import('ember-modifier').default<T>;
type glimmerComponentDefault<T> = import('@glimmer/component').default<T>;

import type { CreatesModifier } from '@glint/template/-private';
import type { ContextType, Invoke } from '@glint/template/-private';
import type { TemplateContext, AcceptsBlocks } from '@glint/template/-private';
import type { Invokable } from '@glint/template/-private/resolution';
import type { EmptyObject } from '@glint/template/-private/signature';

type Get<T, Key, Otherwise = EmptyObject> = Key extends keyof T
  ? Exclude<T[Key], undefined>
  : Otherwise;

export interface ComponentSignature {
  Args?: Partial<Record<string, unknown>>;
  Yields?: Partial<Record<string, Array<unknown>>>;
}

export const GlimmerComponent = (glimmerComponent.default as unknown) as new <
  T extends ComponentSignature = {}
>(
  ...args: ConstructorParameters<typeof import('@glimmer/component').default>
) => GlimmerComponent<T>;
export interface GlimmerComponent<T extends ComponentSignature = {}>
  extends glimmerComponentDefault<Get<T, 'Args'>> {
  [Invoke]: (args: Get<T, 'Args'>) => AcceptsBlocks<Get<T, 'Yields'>>;
  [ContextType]: TemplateContext<this, Get<T, 'Args'>, Get<T, 'Yields'>>;
}

export const EmberComponent = (emberComponent.default as unknown) as new <
  T extends ComponentSignature = {}
>(
  ...args: ConstructorParameters<typeof emberComponent.default>
) => EmberComponent<T>;
export interface EmberComponent<T extends ComponentSignature = {}>
  extends Omit<import('@ember/component').default, ''> {
  [Invoke]: (args: Get<T, 'Args'>) => AcceptsBlocks<Get<T, 'Yields'>>;
  [ContextType]: TemplateContext<this, Get<T, 'Args'>, Get<T, 'Yields'>>;
}

export interface HelperSignature {
  NamedArgs?: Record<string, unknown>;
  PositionalArgs?: Array<unknown>;
  Return?: unknown;
}

// Overriding `compute` directly is impossible because the base class has such
// wide parameter types, so we explicitly exclude that from the interface we're
// extending here so our override can "take" without an error.
export const Helper = (emberComponentHelper.default as unknown) as new <
  T extends HelperSignature
>() => Helper<T>;
export interface Helper<T extends HelperSignature>
  extends Omit<import('@ember/component/helper').default, 'compute'> {
  compute(
    params: Get<T, 'PositionalArgs', []>,
    hash: Get<T, 'NamedArgs'>
  ): Get<T, 'Return', undefined>;

  [Invoke]: (
    named: Get<T, 'NamedArgs'>,
    ...positional: Extract<Get<T, 'PositionalArgs', []>, unknown[]>
  ) => Get<T, 'Return'>;
}

export interface ModifierSignature {
  NamedArgs?: Record<string, unknown>;
  PositionalArgs?: Array<unknown>;
}

export const Modifier = emberModifier.default as new <T extends ModifierSignature>() => Modifier<T>;
export interface Modifier<T extends ModifierSignature>
  extends emberModifierDefault<{
    named: Extract<Get<T, 'NamedArgs'>, Record<string, any>>;
    positional: Extract<Get<T, 'PositionalArgs', []>, any[]>;
  }> {
  [Invoke]: (
    args: Get<T, 'NamedArgs'>,
    ...positional: Extract<Get<T, 'PositionalArgs', []>, unknown[]>
  ) => CreatesModifier;
}

export const helper = emberComponentHelper.helper as HelperFactory;
export const modifier = emberModifier.modifier as ModifierFactory;

type HelperFactory = <Positional extends unknown[] = [], Named = EmptyObject, Return = unknown>(
  fn: (params: Positional, hash: Named) => Return
) => new () => Invokable<(named: Named, ...positional: Positional) => Return>;

type ModifierFactory = <El extends Element, Positional extends unknown[] = [], Named = EmptyObject>(
  fn: (element: El, positional: Positional, named: Named) => unknown
) => new () => Invokable<(named: Named, ...positional: Positional) => CreatesModifier>;
