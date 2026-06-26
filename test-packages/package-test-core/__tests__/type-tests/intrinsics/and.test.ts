import { resolve } from '@glint/ember-tsc/-private/dsl';
import type { AndHelper } from '@glint/ember-tsc/-private/intrinsics/truth-helpers';
import { expectTypeOf } from 'expect-type';

let and = resolve({} as AndHelper);

declare const str: string;
declare const num: number;
declare const obj: object;
declare const obj2: { id: number };
declare const falsyBox: { isTruthy: false };

// `(and ...)` returns the first falsy operand, falling back to the last. When a
// leading operand's type is statically truthy (e.g. a non-nullable `object`),
// narrowing drops it and the result is the *type* of the surviving operand —
// not just a literal.
expectTypeOf(and(obj, str)).toEqualTypeOf<string>();

// Every leading operand statically truthy → short-circuits all the way to the
// trailing operand.
expectTypeOf(and(obj, obj2, str)).toEqualTypeOf<string>();

// A statically falsy leading operand short-circuits to *itself*.
expectTypeOf(and(falsyBox, str)).toEqualTypeOf<{ isTruthy: false }>();

// When a leading operand's truthiness is indeterminate (a plain `string` could
// be `''`), it is retained alongside the downstream result.
expectTypeOf(and(str, num)).toEqualTypeOf<string | number>();
