import { resolve } from '@glint/ember-tsc/-private/dsl';
import type { NeqHelper } from '@glint/ember-tsc/-private/intrinsics/comparison';
import { expectTypeOf } from 'expect-type';

let neq = resolve({} as NeqHelper);

declare const str: string;
declare const str2: string;
declare const num: number;
declare const status: 'active' | 'inactive';
declare const obj: object;
declare const obj2: { id: number };

// `(neq a b)` mirrors `(eq a b)`: mutually-assignable operand types are never
// unequal, so the result narrows to the `false` literal.
expectTypeOf(neq(str, str2)).toEqualTypeOf<false>();
expectTypeOf(neq(num, num)).toEqualTypeOf<false>();

// Disjoint types stay `boolean`.
expectTypeOf(neq(str, num)).toEqualTypeOf<boolean>();
expectTypeOf(neq(obj, obj2)).toEqualTypeOf<boolean>();

// Subtype-vs-supertype is indeterminate in either operand order.
expectTypeOf(neq(status, str)).toEqualTypeOf<boolean>();
expectTypeOf(neq(str, status)).toEqualTypeOf<boolean>();
