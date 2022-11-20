// This module contains utilities for converting signature types defined
// in userspace into our internal representation of an invokable's
// function type signature.

import { EmptyObject, NamedArgs, UnwrapNamedArgs } from './integration';

/**
 * Given an "args hash" (e.g. `{ Named: {...}; Positional: [...] }`),
 * returns a tuple type representing the parameters
 */
export type InvokableArgs<Args> = [
  ...positional: Constrain<Get<Args, 'Positional'>, Array<unknown>, []>,
  ...named: MaybeNamed<NamedArgs<GuardEmpty<Get<Args, 'Named'>>>>
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
        Named: Get<S['Args'], 'Named', EmptyObject>;
        Positional: Get<S['Args'], 'Positional', []>;
      }
    : {
        Named: S['Args'];
        Positional: [];
      }
  : {
      Named: keyof S extends 'Args' | 'Blocks' | 'Element' ? EmptyObject : S;
      Positional: [];
    };

/** Given a signature `S`, get back the normalized `Blocks` type. */
export type ComponentSignatureBlocks<S> = S extends { Blocks: infer Blocks }
  ? {
      [Block in keyof Blocks]: Blocks[Block] extends unknown[]
        ? { Params: { Positional: Blocks[Block] } }
        : Blocks[Block];
    }
  : EmptyObject;

/** Given a component signature `S`, get back the `Element` type. */
export type ComponentSignatureElement<S> = S extends { Element: infer Element } ? Element : null;

// These shenanigans are necessary to get TS to report when named args
// are passed to a signature that doesn't expect any, because `{}` is
// special-cased in the type system not to trigger EPC.
export type GuardEmpty<T> = T extends any ? (keyof T extends never ? EmptyObject : T) : never;

export type PrebindArgs<T, Args extends keyof UnwrapNamedArgs<T>> = NamedArgs<
  Omit<UnwrapNamedArgs<T>, Args> & Partial<Pick<UnwrapNamedArgs<T>, Args>>
>;

export type MaybeNamed<T> = {} extends UnwrapNamedArgs<T> ? [named?: T] : [named: T];

export type Get<T, K, Otherwise = unknown> = K extends keyof T ? T[K] : Otherwise;
export type Constrain<T, Constraint, Otherwise = Constraint> = T extends Constraint ? T : Otherwise;
