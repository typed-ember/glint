import { resolve } from '@glint/ember-tsc/-private/dsl';
import type { EqHelper } from '@glint/ember-tsc/-private/intrinsics/comparison';
import { expectTypeOf } from 'expect-type';

let eq = resolve({} as EqHelper);

declare const str: string;
declare const str2: string;
declare const num: number;
declare const status: 'active' | 'inactive';
declare const obj: object;
declare const obj2: { id: number };

// `(eq a b)` narrows its result by relating the operand *types*: when the two
// operands are mutually assignable the result is the `true` literal, otherwise
// it widens to `boolean`. This holds for non-literal operand types, not just
// literal-vs-literal comparisons.
expectTypeOf(eq(str, str2)).toEqualTypeOf<true>();
expectTypeOf(eq(num, num)).toEqualTypeOf<true>();

// Disjoint types can never be equal as far as the type system is concerned, so
// the result stays `boolean`.
expectTypeOf(eq(str, num)).toEqualTypeOf<boolean>();
expectTypeOf(eq(obj, obj2)).toEqualTypeOf<boolean>();

// A subtype compared against its supertype is indeterminate in *either* operand
// order: one direction is assignable but not the other.
expectTypeOf(eq(status, str)).toEqualTypeOf<boolean>();
expectTypeOf(eq(str, status)).toEqualTypeOf<boolean>();
