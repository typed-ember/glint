// This module contains utilities for converting signature types defined
// in userspace into our internal representation of an invokable's
// function type signature.

import { NamedArgs, UnwrapNamedArgs } from './integration';

/**
 * Given an "args hash" (e.g. `{ Named: {...}; Positional: [...] }`),
 * returns a tuple type representing the parameters
 */
export type InvokableArgs<Args> = [
  ...positional: Constrain<Get<Args, 'Positional'>, Array<unknown>, []>,
  ...named: MaybeNamed<NamedArgs<Get<Args, 'Named'>>>,
];

/** Given a signature `S`, get back the normalized `Args` type. */
export type ComponentSignatureArgs<S> = S extends {
  Args: infer Args;
}
  ? Args extends {
      Named?: object;
      Positional?: unknown[];
    }
    ? {
        Named: Get<S['Args'], 'Named', {}>;
        Positional: Get<S['Args'], 'Positional', []>;
      }
    : {
        Named: S['Args'];
        Positional: [];
      }
  : {
      Named: keyof S extends 'Args' | 'Blocks' | 'Element' ? {} : S;
      Positional: [];
    };

/** Given a signature `S`, get back the normalized `Blocks` type. */
export type ComponentSignatureBlocks<S> = S extends { Blocks: infer Blocks }
  ? {
      [Block in keyof Blocks]: Blocks[Block] extends unknown[]
        ? { Params: { Positional: Blocks[Block] } }
        : Blocks[Block];
    }
  : {};

/** Given a component signature `S`, get back the `Element` type. */
// The original `NonNullable<Element> extends never` check deferred for generic
// conditional types like ElementFromTagName<T>, collapsing them to unknown
// (#610). Using `Element extends null` instead only fires for literal null
// (preserving null → unknown for ComponentLike equivalence) without breaking
// conditional types — TypeScript can verify the deferred result still extends
// Element because neither branch of ElementFromTagName<T> is null.
export type ComponentSignatureElement<S> = S extends { Element: infer Element }
  ? Element extends null
    ? unknown
    : Element
  : unknown;

export type PrebindArgs<T, Args extends keyof UnwrapNamedArgs<T>> = NamedArgs<
  Omit<UnwrapNamedArgs<T>, Args> & Partial<Pick<UnwrapNamedArgs<T>, Args>>
>;

// Keys across all constituents of a (possibly union) named-args type. Plain
// `keyof UnwrapNamedArgs<T>` would only see keys common to every constituent.
type UnionKeysOf<T> = T extends any ? keyof UnwrapNamedArgs<T> : never;

// Note: this must produce a single parameter tuple rather than distributing a
// union `T` into a union of tuples. A union of tuples breaks contravariant
// assignability against the `(named: NamedArgs<Named>)` patterns used by
// `{{component}}`/`{{helper}}`/`{{modifier}}` to pre-bind named args (#1144).
// The checks below are still union-aware: `{} extends A | B` holds when any
// constituent accepts an empty hash, and `UnionKeysOf` collects keys from all
// constituents.
export type MaybeNamed<T> =
  {} extends UnwrapNamedArgs<T>
    ? [UnionKeysOf<T>] extends [never]
      ? []
      : [named?: T]
    : [named: T];

export type Get<T, K, Otherwise = unknown> = K extends keyof T ? T[K] : Otherwise;
export type Constrain<T, Constraint, Otherwise = Constraint> = T extends Constraint ? T : Otherwise;

export type TupleOfSize<Len extends number, Acc extends unknown[] = []> = Acc['length'] extends Len
  ? Acc
  : TupleOfSize<Len, [any, ...Acc]>;

export type SliceTo<T extends unknown[], Index extends number> = T['length'] extends Index
  ? T
  : T extends [...infer Rest, any?]
    ? SliceTo<Rest, Index>
    : [];

export type SliceFrom<T extends unknown[], Index extends number> = T extends [
  ...TupleOfSize<Index>,
  ...infer Rest,
]
  ? Rest
  : [];
