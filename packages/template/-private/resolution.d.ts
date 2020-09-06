/*
 * This module contains types and functions related to resolving the
 * _template signature_ and _template context_ for various values.
 */

import { NoNamedArgs } from './signature';
import { ContextResolutions, SignatureResolutions } from '../resolution-rules';

export declare const ResolutionKey: unique symbol;
export type ResolutionKey = typeof ResolutionKey;

type ContextResolutionKeys = keyof ContextResolutions<unknown>;
type SignatureResolutionKeys = keyof SignatureResolutions<unknown>;

type Resolvable<Key> = Record<ResolutionKey, Key>;

// Used to ensure `resolve` and `resolveOrReturn` behave reasonably
// when they receive an argument of type `any` or `never`
declare const AnyGuard: unique symbol;
type AnyGuard = typeof AnyGuard;

/**
 * This type is used to determine the context that a template is run in.
 * That is, if a template is associated with a given class, then the type
 * `ResolveContext<ThatClass>` will determine the type of `this` and any
 * `@arg`s used in the template, as well as the expected blocks and the
 * parameter types that will be yielded to them.
 *
 * For example, `ResolveContext<GlimmerComponent<T>>` will result in a type
 * like `{ args: T; this: GlimmerComponent<T>; yields: { default?: [] } }`.
 */
export type ResolveContext<T extends Resolvable<unknown>> = T extends Resolvable<infer Key>
  ? Key extends ContextResolutionKeys
    ? ContextResolutions<T>[Key]
    : never
  : never;

/**
 * This type is used to determine what args and blocks a given value
 * will accept when invoked in a template.
 */
export type ResolveSignature<T extends Resolvable<unknown>> = T extends Resolvable<infer Key>
  ? Key extends SignatureResolutionKeys
    ? SignatureResolutions<T>[Key]
    : never
  : never;

/**
 * Given a value that the user is attempting to invoke as a helper,
 * component or modifier, returns the appropriate signature for that
 * value if applicable, or `unknown` otherwise.
 */
// Resolving an `any` or `never` value always returns `any`
export declare function resolve<T extends AnyGuard>(item: T): any;
// Resolving a value with an explicit `ResolutionKey` key uses that key to resolve
export declare function resolve<T extends Resolvable<SignatureResolutionKeys>>(
  item: T
): ResolveSignature<T>;
// Resolving a value that's a constructor for a type with a `ResolutionKey` uses that key.
// Note that it may appear we could just use `ResolveSignature<Instance>` as the return type, but
// returning a constructed function type allows us to preserve any type parameters on the class
// itself that may impact the types of its args.
export declare function resolve<
  Args extends unknown[],
  Instance extends Resolvable<SignatureResolutionKeys>
>(
  item: new (...args: Args) => Instance
): (...args: Parameters<ResolveSignature<Instance>>) => ReturnType<ResolveSignature<Instance>>;
export declare function resolve<T extends Function>(item: T): T;

/*
 * A mustache like `{{this.foo}}` might either return a plain value like a string
 * or number, or it might be an arg-less invocation of a helper (or even a curly
 * component, depending on context).
 *
 * This variant of `resolve` is used for such mustaches, treating values with
 * no associated signature as though they were arg-less helpers that return a
 * value of the appropriate type.
 */
export declare function resolveOrReturn<T extends AnyGuard>(item: T): any;
export declare function resolveOrReturn<T extends Resolvable<SignatureResolutionKeys>>(
  item: T
): ResolveSignature<T>;
export declare function resolveOrReturn<
  Args extends unknown[],
  Instance extends Resolvable<SignatureResolutionKeys>
>(
  item: new (...args: Args) => Instance
): (...args: Parameters<ResolveSignature<Instance>>) => ReturnType<ResolveSignature<Instance>>;
export declare function resolveOrReturn<T extends Function>(item: T): T;
export declare function resolveOrReturn<T>(item: T): (args: NoNamedArgs) => T;
