import { DirectInvokable } from '@glint/template/-private/integration';

// NOTE: `eq`/`neq` (RFC 561) are not represented here. Because their runtime is
// exactly `left === right` / `left !== right`, they are emitted as the native
// `===`/`!==` operators (see the `ember-template-imports` environment's
// `specialForms`) — which, unlike a boolean-returning helper type, lets
// TypeScript narrow discriminated unions in `{{#if (eq foo.kind "a")}}`. The
// `lt`/`lte`/`gt`/`gte` keywords below have no narrowing benefit and remain
// ordinary helpers.

/** `(lt a b)` — less-than. Built-in keyword in ember-source >= 7.1. */
export type LtHelper = DirectInvokable<{
  <T extends number | string | Date>(a: T, b: T): boolean;
}>;

/** `(lte a b)` — less-than-or-equal. Built-in keyword in ember-source >= 7.1. */
export type LteHelper = DirectInvokable<{
  <T extends number | string | Date>(a: T, b: T): boolean;
}>;

/** `(gt a b)` — greater-than. Built-in keyword in ember-source >= 7.1. */
export type GtHelper = DirectInvokable<{
  <T extends number | string | Date>(a: T, b: T): boolean;
}>;

/** `(gte a b)` — greater-than-or-equal. Built-in keyword in ember-source >= 7.1. */
export type GteHelper = DirectInvokable<{
  <T extends number | string | Date>(a: T, b: T): boolean;
}>;
