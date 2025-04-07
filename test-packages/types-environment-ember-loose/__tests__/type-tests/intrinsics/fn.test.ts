import { expectTypeOf } from 'expect-type';
import { Globals, resolve } from '@glint/environment-ember-loose/-private/dsl';

let fn = resolve(Globals['fn']);

// @ts-expect-error: invalid arg
fn((t: string) => t, 123);

expectTypeOf(fn(() => true)).toEqualTypeOf<() => boolean>();
expectTypeOf(fn((arg: string) => arg.length)).toEqualTypeOf<(arg: string) => number>();
expectTypeOf(fn((arg: string) => arg.length, 'hi')).toEqualTypeOf<() => number>();

let identity = <T>(x: T): T => x;

// Bound type parameters are reflected in the output
expectTypeOf(fn(identity, 'hi')).toEqualTypeOf<() => string>();

// Unbound type parameters survive to the output
expectTypeOf(fn(identity)).toEqualTypeOf<{ <T>(x: T): T }>();
