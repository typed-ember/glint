import { DirectInvokable } from '@glint/template/-private/integration';

/**
 * `(array a b ...)` — packs the positional arguments into a typed tuple.
 * Built-in keyword in ember-source >= 7.1 (RFC 1000).
 */
export type ArrayHelper = DirectInvokable<{
  <const T extends unknown[]>(...args: T): T;
}>;

/**
 * `(hash key=value ...)` — packs the named arguments into a typed object.
 * Built-in keyword in ember-source >= 7.1 (RFC 999).
 */
export type HashHelper = DirectInvokable<{
  <const T extends Record<string, unknown>>(args: T): T;
}>;
