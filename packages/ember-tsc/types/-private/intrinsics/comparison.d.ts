import { DirectInvokable } from '@glint/template/-private/integration';

/**
 * `(eq a b)` — strict equality of two values. Built-in keyword in
 * ember-source >= 7.1 (RFC 561).
 *
 * NOTE: in templates `eq` is emitted as the native `===` operator (see the
 * `ember-template-imports` environment's `specialForms`), because the runtime
 * implementation is exactly `left === right`. Doing so lets TypeScript narrow
 * discriminated unions in `{{#if (eq foo.kind "a")}}`, which a boolean-returning
 * helper type cannot. This type therefore is NOT consulted for template
 * type-checking; it is retained only to register `eq` as a known global.
 */
export type EqHelper = DirectInvokable<{
  <A, B>(a: A, b: B): [A] extends [B] ? ([B] extends [A] ? true : boolean) : boolean;
}>;

/**
 * `(neq a b)` — strict inequality. Built-in keyword in ember-source >= 7.1.
 *
 * Like `eq`, this is emitted as the native `!==` operator in templates (the
 * runtime is `left !== right`), enabling discriminated-union narrowing; the
 * type below is not consulted for template type-checking.
 */
export type NeqHelper = DirectInvokable<{
  <A, B>(a: A, b: B): [A] extends [B] ? ([B] extends [A] ? false : boolean) : boolean;
}>;

/** `(lt a b)` — numeric less-than. Built-in keyword in ember-source >= 7.1. */
export type LtHelper = DirectInvokable<{
  (a: number, b: number): boolean;
}>;

/** `(lte a b)` — numeric less-than-or-equal. Built-in keyword in ember-source >= 7.1. */
export type LteHelper = DirectInvokable<{
  (a: number, b: number): boolean;
}>;

/** `(gt a b)` — numeric greater-than. Built-in keyword in ember-source >= 7.1. */
export type GtHelper = DirectInvokable<{
  (a: number, b: number): boolean;
}>;

/** `(gte a b)` — numeric greater-than-or-equal. Built-in keyword in ember-source >= 7.1. */
export type GteHelper = DirectInvokable<{
  (a: number, b: number): boolean;
}>;
