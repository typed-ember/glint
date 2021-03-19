/*
 * This module contains types and functions used for defining
 * the template value associated with a particular component
 * class.
 */

import { AnyContext } from './resolution';

declare const Template: unique symbol;
export type Template = { [Template]: true };

/**
 * Determines the type of `this` and any `@arg`s used in a template,
 * as well as any explicit types for yielded parameters.
 *
 * This type is typically the return type of an application of
 * `ResolveContext` from `resolution.d.ts`.
 */
export type TemplateContext<This, Args, Yields, Element> = {
  this: This;
  args: Args;
  yields: Yields;
  element: Element;
};

/**
 * Accepts a generator function declaring an expected template context,
 * and returns an appropriate invokable type that accepts the required
 * named args and a set of blocks as determined by any `BlockYield`s
 * included in the generators iterator type.
 */
export declare function template(f: (𝚪: AnyContext) => void): Template;
