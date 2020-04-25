/**
 * This module contains types and functions related to resolving the
 * _template signature_ and _template context_ for various values.
 */
declare const ModuleDocs: void;

/* eslint-disable @typescript-eslint/no-empty-interface */
import { ReturnsValue } from './signature';

type Values<T> = T[keyof T];
type ExcludeUnmatched<T> = Exclude<T, Unmatched> extends Unmatched
  ? unknown
  : Exclude<T, Unmatched>;

declare const Unmatched: unique symbol;
export type Unmatched = typeof Unmatched;

/**
 * When transforming a tagged template string into a TS representation,
 * the resulting value must indicate the context it expects to be
 * executed against. This means determing two things: the type of `this`
 * in the template, and the type of any `@arg`s referenced.
 *
 * These values are dependent on the component manager in use for a
 * given template, so this interface acts as a registry type that can
 * theoretically be extended to account for specialized components with
 * their own managers (although this is currently housed under a `-private`
 * directory).
 *
 * See `built-ins/resolutions.d.ts` for the default baked-in context
 * resolution rules.
 */
export interface ContextResolutions<Host> {}

/**
 * For any invokable value in a template, its template signature defines
 * the arguments it expects to receive, as well as whether it expects to
 * be invoked inline and return a value, invoked as a modifier, or
 * invoked with a particular set of blocks.
 *
 * For example, when a user writes `<SomeComponent />` in a template,
 * the first step in typechecking that invocation is determing the
 * signature of `SomeComponent` to figure out what args and blocks it
 * expects.
 *
 * This interface is a registry type whose values determine the possible
 * signature for a given type of value. Although it's currently housed
 * under a `-private` directory, the use of an interface in this manner
 * allows for the signature resolution behavior to be extended by external
 * packages using declaration merging. See `built-ins/resolutions.d.ts` for
 * the default baked-in signature resolution rules.
 */
export interface SignatureResolutions<InvokedValue> {}

/**
 * This type is used to determine the context that a template is run in.
 * That is, if a template is associated with a given class, then the type
 * `ResolveContext<ThatClass>` will determine the type of `this` and any
 * `@arg`s used in the template.
 *
 * For example, `ResolveContext<GlimmerComponent<T>>` will result in a type
 * like `{ args: T, this: GlimmerComponent<T> }`.
 */
export type ResolveContext<T> = ExcludeUnmatched<Values<ContextResolutions<T>>>;

/**
 * This type is used to determine what args and blocks a given value
 * will accept when invoked in a template.
 */
export type ResolveSignature<T> = ExcludeUnmatched<Values<SignatureResolutions<T>>>;

/**
 * Given a value that the user is attempting to invoke as a helper,
 * component or modifier, returns the appropriate signature for that
 * value if applicable, or `unknown` otherwise.
 */
export declare function resolve<T>(item: T): ResolveSignature<T>;

/**
 * A mustache like `{{this.foo}}` might either return a plain value like a string
 * or number, or it might be an arg-less invocation of a helper (or even a curly
 * component, depending on context).
 *
 * This variant of `resolve` is used for such mustaches, treating values with
 * no associated signature as though they were arg-less helpers that return a
 * value of the appropriate type.
 */
export declare function resolveOrReturn<T extends object>(
  item: T
): unknown extends ResolveSignature<T> ? (args: {}) => ReturnsValue<T> : ResolveSignature<T>;
export declare function resolveOrReturn<T>(item: T): (args: {}) => ReturnsValue<T>;
