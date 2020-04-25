import { expectType, expectError } from 'tsd';
import { resolve, BuiltIns, invokeInline } from '@glint/template';

const fn = resolve(BuiltIns['fn']);
const f = (x: string, y: number): number => x.length + y;
const id = <T>(x: T): T => x;

// A no-op curry works
expectType<(x: string, y: number) => number>(invokeInline(fn({}, f)));

// Currying one arg works
expectType<(y: number) => number>(invokeInline(fn({}, f, 'hello')));

// Currying all args works
expectType<() => number>(invokeInline(fn({}, f, 'hello', 123)));

// Currying with a bad argument fails
expectError(fn({}, f, true));

// Type parameters degrade to `unknown` by default (limitation, not a feature)
expectType<(x: unknown) => unknown>(invokeInline(fn({}, id)));

// Type parameters are preserved when fixed by an input
expectType<() => string>(invokeInline(fn({}, id, 'hello')));
