import { expectTypeOf } from 'expect-type';
import { resolve, Globals, invokeInline } from '@glint/template';

const fn = resolve(Globals['fn']);
const f = (x: string, y: number): number => x.length + y;
const id = <T>(x: T): T => x;

// A no-op curry works
expectTypeOf(invokeInline(fn({}, f))).toEqualTypeOf<(x: string, y: number) => number>();

// Currying one arg works
expectTypeOf(invokeInline(fn({}, f, 'hello'))).toEqualTypeOf<(y: number) => number>();

// Currying all args works
expectTypeOf(invokeInline(fn({}, f, 'hello', 123))).toEqualTypeOf<() => number>();

// @ts-expect-error: Currying with a bad argument fails
fn({}, f, true);

// Type parameters degrade to `unknown` by default (limitation, not a feature)
expectTypeOf(invokeInline(fn({}, id))).toEqualTypeOf<(x: unknown) => unknown>();

// Type parameters are preserved when fixed by an input
expectTypeOf(invokeInline(fn({}, id, 'hello'))).toEqualTypeOf<() => string>();
