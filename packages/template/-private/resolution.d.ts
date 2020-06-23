/**
 * This module contains types and functions related to resolving the
 * _template signature_ and _template context_ for various values.
 */
declare const ModuleDocs: void;

import { ReturnsValue, AnySignature, NoNamedArgs } from './signature';
import { ContextResolutions, SignatureResolutions } from '../resolution-rules';

export declare const ResolutionKey: unique symbol;
export type ResolutionKey = typeof ResolutionKey;

type ContextResolutionKeys = keyof ContextResolutions<unknown>;
type SignatureResolutionKeys = keyof SignatureResolutions<unknown>;

type Resolvable<Key> =
  | Record<ResolutionKey, Key>
  | (new (...params: any) => Record<ResolutionKey, Key>);

/**
 * This type is used to determine the context that a template is run in.
 * That is, if a template is associated with a given class, then the type
 * `ResolveContext<ThatClass>` will determine the type of `this` and any
 * `@arg`s used in the template.
 *
 * For example, `ResolveContext<GlimmerComponent<T>>` will result in a type
 * like `{ args: T, this: GlimmerComponent<T> }`.
 */
export type ResolveContext<T> = T extends Resolvable<infer Key>
  ? Key extends ContextResolutionKeys
    ? ContextResolutions<T>[Key]
    : unknown
  : unknown;

/**
 * This type is used to determine what args and blocks a given value
 * will accept when invoked in a template.
 */
export type ResolveSignature<T> = T extends Resolvable<infer Key>
  ? Key extends SignatureResolutionKeys
    ? SignatureResolutions<T>[Key]
    : unknown
  : unknown;

/**
 * Given a value that the user is attempting to invoke as a helper,
 * component or modifier, returns the appropriate signature for that
 * value if applicable, or `unknown` otherwise.
 */
export declare function resolve<T extends Resolvable<SignatureResolutionKeys>>(
  item: T
): ResolveSignature<T>;
export declare function resolve<T extends AnySignature>(item: T): T;

/**
 * A mustache like `{{this.foo}}` might either return a plain value like a string
 * or number, or it might be an arg-less invocation of a helper (or even a curly
 * component, depending on context).
 *
 * This variant of `resolve` is used for such mustaches, treating values with
 * no associated signature as though they were arg-less helpers that return a
 * value of the appropriate type.
 */
export declare function resolveOrReturn<T extends Resolvable<SignatureResolutionKeys>>(
  item: T
): ResolveSignature<T>;
export declare function resolveOrReturn<T extends AnySignature>(item: T): T;
export declare function resolveOrReturn<T>(item: T): (args: NoNamedArgs) => ReturnsValue<T>;
