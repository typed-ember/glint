import { Ember } from './-ember';
import type { Invoke, Invokable, EmptyObject } from '@glint/template/-private/integration';
import type { StaticSide } from '../-private/utilities';

declare const GivenSignature: unique symbol;

type EmberHelper = import('@ember/component/helper').default;
type EmberHelperConstructor = typeof import('@ember/component/helper').default;

const EmberHelper: EmberHelperConstructor = Ember.Helper;
const emberHelper = EmberHelper.helper;

type Get<T, Key, Otherwise = EmptyObject> = Key extends keyof T ? T[Key] : Otherwise;

type HelperFactory = <Positional extends unknown[] = [], Named = EmptyObject, Return = unknown>(
  fn: (params: Positional, hash: Named) => Return
) => new () => Invokable<(named: Named, ...positional: Positional) => Return>;

/** @deprecated Import directly from `@ember/component/helper` instead. */
export const helper = emberHelper as unknown as HelperFactory;

/** @deprecated Define signatures with no parent interface. */
export interface HelperSignature {
  NamedArgs?: object;
  PositionalArgs?: Array<unknown>;
  Return?: unknown;
}

// Factoring this into a standalone type prevents `tsc` from expanding the
// `ConstructorParameters` type inline when producing `.d.ts` files, which
// breaks consumers depending on their version of the upstream types.
type HelperConstructor = {
  new <T extends HelperSignature = {}>(
    ...args: ConstructorParameters<EmberHelperConstructor>
  ): Helper<T>;
};

// Overriding `compute` directly is impossible because the base class has such
// wide parameter types, so we explicitly exclude that from the interface we're
// extending here so our override can "take" without an error.
/** @deprecated Import directly from `@ember/component/helper`. */
const Helper = EmberHelper as unknown as StaticSide<typeof EmberHelper> & HelperConstructor;

type Helper<T extends HelperSignature> = Omit<EmberHelper, 'compute'> & HelperIntegration<T>;

interface HelperIntegration<T extends HelperSignature> {
  compute(
    params: Get<T, 'PositionalArgs', []>,
    hash: Get<T, 'NamedArgs'>
  ): Get<T, 'Return', undefined>;

  // Allows `extends Helper<infer Signature>` clauses to work as expected
  [GivenSignature]: T;

  [Invoke]: (
    named: Get<T, 'NamedArgs'>,
    ...positional: Exclude<Get<T, 'PositionalArgs', []>, undefined>
  ) => Get<T, 'Return'>;
}

export default Helper;
