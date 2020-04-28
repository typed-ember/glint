/* eslint-disable @typescript-eslint/no-empty-interface */

export declare const ResolutionKey: unique symbol;
export type ResolutionKey = typeof ResolutionKey;

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
