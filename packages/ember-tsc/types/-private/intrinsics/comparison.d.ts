import { DirectInvokable } from '@glint/template/-private/integration';

/**
 * `(eq a b)` — strict equality of two values. Built-in keyword in
 * ember-source >= 7.1 (RFC 561). The result is narrowed when both sides are
 * literal types so templates such as `{{#if (eq this.kind "primary")}}` get
 * accurate type information.
 */
export type EqHelper = DirectInvokable<{
  <A, B>(a: A, b: B): [A] extends [B] ? ([B] extends [A] ? true : boolean) : boolean;
}>;

/** `(neq a b)` — strict inequality. Built-in keyword in ember-source >= 7.1. */
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
