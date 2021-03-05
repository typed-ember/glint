/*
 * This module contains types and functions related to resolving the
 * _template signature_ and _template context_ for various values.
 */

import { NoNamedArgs } from './signature';
import { TemplateContext } from './template';

declare const Invoke: unique symbol;
export type Invokable<T extends AnySignature = AnySignature> = { [Invoke]: T };

declare const ContextType: unique symbol;
export type HasContext<T extends AnyContext = AnyContext> = { [ContextType]: T };

export type AnySignature = (...args: any) => any;
export type AnyContext = TemplateContext<any, any, any>;
export type ResolveContext<T> = T extends HasContext<infer Context> ? Context : unknown;

/*
 * We have multiple ways of representing invokable values, dictated by certain constraints
 * of how TypeScript works. The purpose of `resolve` is to take any one of these types of
 * values and return a function of the following form:
 *
 *     (args: Named, ...positional: Positional) => Result
 *
 * `Named` and `Positional` represent the respective types of the named and positional
 * args accepted, and `Result` is either `CreatesModifier`, `AcceptsBlocks<...>`, or any
 * other type to simply indicate that the invokable returns a value.
 *
 * In the core, invokables can take one of two forms:
 *
 *  - `new (...) => Invokable<T>`: this is the typical signature for items such as a
 *    component subclass. In resolving this form, we need to break apart the construct
 *    signature and reconstruct it as a regular function, which has the implicit effect
 *    of preserving type parameters for polymorphic components in the resulting function
 *    type.
 *  - `Invokable<T>`: While items like component classes can't directly be `Invokable<T>`
 *    themselves (among other things, their instance's type params wouldn't be in scope),
 *    this form is useful for certain complex cases that may require explicitly declaring
 *    a type rather than inferring it. Breaking apart and reconstructing a function
 *    signature as we do above will cause functions with multipe signatures to collapse
 *    down to their most general form, which breaks complex declarations like `fn` that
 *    rely on having multiple overrides to be typed correctly.
 *
 * In GlimmerX (and potentially other future environments), plain functions can themselves
 * be invokables with their own particular resolution semantics.
 */

export declare function resolve<T extends Invokable>(item: T): T[typeof Invoke];
export declare function resolve<Args extends unknown[], Instance extends Invokable>(
  item: new (...args: Args) => Instance
): (...args: Parameters<Instance[typeof Invoke]>) => ReturnType<Instance[typeof Invoke]>;

/*
 * A mustache like `{{this.foo}}` might either return a plain value like a string
 * or number, or it might be an arg-less invocation of a helper (or even a curly
 * component, depending on context).
 *
 * This variant of `resolve` is used for such mustaches, treating values with
 * no associated signature as though they were arg-less helpers that return a
 * value of the appropriate type.
 */

export declare function resolveOrReturn<T extends Invokable>(item: T): T[typeof Invoke];
export declare function resolveOrReturn<Args extends unknown[], Instance extends Invokable>(
  item: new (...args: Args) => Instance
): (...args: Parameters<Instance[typeof Invoke]>) => ReturnType<Instance[typeof Invoke]>;
export declare function resolveOrReturn<T>(item: T): (args: NoNamedArgs) => T;
