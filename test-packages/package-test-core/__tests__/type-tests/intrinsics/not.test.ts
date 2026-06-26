import { resolve } from '@glint/ember-tsc/-private/dsl';
import type { NotHelper } from '@glint/ember-tsc/-private/intrinsics/truth-helpers';
import { expectTypeOf } from 'expect-type';

let not = resolve({} as NotHelper);

// `(not value)` is typed as a type predicate over Ember's `Falsy` type, so using
// it as a condition *narrows* the operand: the truthy-negation branch keeps the
// falsy members, and the `else` branch keeps the truthy members. (This is the
// value-land equivalent of `{{#if (not x)}} ... {{else}} ... {{/if}}`.)

declare const maybeUser: { name: string } | undefined;
if (not(maybeUser)) {
  expectTypeOf(maybeUser).toEqualTypeOf<undefined>();
} else {
  expectTypeOf(maybeUser).toEqualTypeOf<{ name: string }>();
}

// For a `string | undefined`, only the statically-nameable falsy member
// (`undefined`) can be extracted; the else branch is therefore `string`.
declare const maybeStr: string | undefined;
if (not(maybeStr)) {
  expectTypeOf(maybeStr).toEqualTypeOf<undefined>();
} else {
  expectTypeOf(maybeStr).toEqualTypeOf<string>();
}

// Ember's `isTruthy` protocol participates through the `Falsy` type, so a union
// discriminated by `isTruthy` narrows in both directions.
declare const box: { isTruthy: true; data: number } | { isTruthy: false };
if (not(box)) {
  expectTypeOf(box).toEqualTypeOf<{ isTruthy: false }>();
} else {
  expectTypeOf(box).toEqualTypeOf<{ isTruthy: true; data: number }>();
}

// As a *value* (rather than a condition), the predicate's type is `boolean`.
expectTypeOf(not(maybeUser)).toEqualTypeOf<boolean>();
