import { resolve } from '@glint/ember-tsc/-private/dsl';
import type { OrHelper } from '@glint/ember-tsc/-private/intrinsics/truth-helpers';
import { expectTypeOf } from 'expect-type';

let or = resolve({} as OrHelper);

declare const str: string;
declare const maybeStr: string | undefined;
declare const nullableStr: string | null;
declare const obj: object;
declare const truthyBox: { isTruthy: true };
declare const falsyBox: { isTruthy: false };

// `(or ...)` returns the first truthy operand, falling back to the last. The
// useful narrowing here is on non-literal types: a leading operand has its
// falsy members excluded once a later operand can supply a value.
expectTypeOf(or(maybeStr, str)).toEqualTypeOf<string>(); // `undefined` excluded
expectTypeOf(or(nullableStr, str)).toEqualTypeOf<string>(); // `null` excluded

// A statically falsy leading operand is dropped entirely in favour of the next.
expectTypeOf(or(falsyBox, str)).toEqualTypeOf<string>();

// A statically truthy leading operand short-circuits to its own type.
expectTypeOf(or(obj, str)).toEqualTypeOf<object>();
expectTypeOf(or(truthyBox, str)).toEqualTypeOf<{ isTruthy: true }>();
