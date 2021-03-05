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

// Used to ensure `resolve` and `resolveOrReturn` behave reasonably
// when they receive an argument of type `any` or `never`
declare const AnyGuard: unique symbol;
type AnyGuard = typeof AnyGuard;

export type AnySignature = (...args: any) => any;
export type AnyContext = TemplateContext<any, any, any>;
export type ResolveContext<T> = T extends HasContext<infer Context> ? Context : unknown;

/**
 * Given a value that the user is attempting to invoke as a helper,
 * component or modifier, returns the appropriate signature for that
 * value if applicable, or `unknown` otherwise.
 */
// Resolving an `any` or `never` value always returns `any`
export declare function resolve<T extends AnyGuard>(item: T): any;
// Resolving a value with an explicit `SignatureType` key uses that key to resolve
export declare function resolve<T extends HasSignature>(item: T): T[typeof SignatureType];
// Resolving a value that's a constructor for a type with a `SignatureType` uses that key.
// Note that it may appear we could just use `Instance[typeof SignatureType]` as the return type,
// but returning a constructed function type allows us to preserve any type parameters on the
// class itself that may impact the types of its args.
export declare function resolve<Args extends unknown[], Instance extends HasSignature>(
  item: new (...args: Args) => Instance
): (
  ...args: Parameters<Instance[typeof SignatureType]>
) => ReturnType<Instance[typeof SignatureType]>;
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
export declare function resolveOrReturn<T extends HasSignature>(item: T): T[typeof SignatureType];
export declare function resolveOrReturn<Args extends unknown[], Instance extends HasSignature>(
  item: new (...args: Args) => Instance
): (
  ...args: Parameters<Instance[typeof SignatureType]>
) => ReturnType<Instance[typeof SignatureType]>;
export declare function resolveOrReturn<T extends Function>(item: T): T;
export declare function resolveOrReturn<T>(item: T): (args: NoNamedArgs) => T;
