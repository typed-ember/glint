/**
 * This module contains types and functions used for defining
 * the template value associated with a particular component
 * class.
 */
declare const ModuleDocs: void;

import { BlockYield } from './blocks';
import { AcceptsBlocks } from './signature';
import { Invokable } from './invoke';

/**
 * Determines the type of `this` and any `@arg`s used in a template.
 *
 * This type is typically the return type of an application of
 * `ResolveContext` from `resolution.d.ts`.
 */
export type TemplateContext<This, Args> = { this: This; args: Args };

/**
 * Accepts a generator function declaring an expected template context,
 * and returns an appropriate `Invokable` type that accepts the required
 * named args and a set of blocks as determined by any `BlockYield`s
 * included in the generators iterator type.
 */
export declare function template<This, Args, Yields extends BlockYield<string, unknown[]>>(
  f: (𝚪: TemplateContext<This, Args>) => IterableIterator<Yields>
): Invokable<
  (
    args: Args
  ) => AcceptsBlocks<
    {
      [K in Yields['to']]?: Extract<Yields, { to: K }>['values'];
    }
  >
>;
