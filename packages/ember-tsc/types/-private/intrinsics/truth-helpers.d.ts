import { DirectInvokable } from '@glint/template/-private/integration';

import type { FirstFalsy, FirstTruthy, MaybeTruthy, TruthConvert } from './truth-convert';

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
 * `(not value)` — boolean negation using truthy semantics matching the rest
 * of Ember's template-side helpers. Built-in keyword in ember-source >= 7.1
 * (RFC 560).
 */
export type NotHelper = DirectInvokable<{
  <T>(
    value: T,
  ): TruthConvert<T> extends true ? false : TruthConvert<T> extends false ? true : boolean;
}>;
