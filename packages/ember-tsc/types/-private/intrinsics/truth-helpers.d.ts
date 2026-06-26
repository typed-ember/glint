import { DirectInvokable } from '@glint/template/-private/integration';

import type { Falsy, FirstFalsy, FirstTruthy, MaybeTruthy } from './truth-convert';

/**
 * `(and a b ...)` — short-circuit logical AND. Returns the first falsy
 * positional argument or the last argument. Available as a built-in keyword
 * in ember-source >= 7.1 (RFC 560).
 */
export type AndHelper = DirectInvokable<{
  <T extends MaybeTruthy[]>(...args: T): FirstFalsy<T>;
}>;

/**
 * `(or a b ...)` — short-circuit logical OR. Returns the first truthy
 * positional argument or the last argument. Available as a built-in keyword
 * in ember-source >= 7.1 (RFC 560).
 */
export type OrHelper = DirectInvokable<{
  <T extends MaybeTruthy[]>(...args: T): FirstTruthy<T>;
}>;

/**
 * `(not value)` — boolean negation using Handlebars truthiness semantics.
 * Built-in keyword in ember-source >= 7.1 (RFC 560).
 *
 * Typed as a type predicate over Ember's `Falsy` type so that using it as a
 * condition narrows the operand: in `{{#if (not value)}}` the operand is
 * narrowed to its falsy members, and in the `{{else}}` branch to its truthy
 * members. (As a predicate its *value* is `boolean` rather than a `true`/
 * `false` literal — narrowing in conditions is the more useful guarantee.)
 */
export type NotHelper = DirectInvokable<{
  <T>(value: T): value is Extract<T, Falsy>;
}>;
