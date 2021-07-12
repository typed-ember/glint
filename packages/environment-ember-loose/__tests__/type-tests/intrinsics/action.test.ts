import { expectTypeOf } from 'expect-type';
import { Globals, resolve } from '@glint/environment-ember-loose/-private/dsl';

let action = resolve(Globals['action']);

// Basic plumbing
expectTypeOf(action({}, () => 'hi')).toEqualTypeOf<() => string>();
expectTypeOf(action({}, <T>(value: T) => value)).toEqualTypeOf<{ <T>(value: T): T }>();

// Binding parameters
expectTypeOf(action({}, (x: string, y: number) => x.padStart(y), 'hello')).toEqualTypeOf<
  (y: number) => string
>();
expectTypeOf(action({}, (x: string, y: number) => x.padStart(y), 'hello', 123)).toEqualTypeOf<
  () => string
>();
expectTypeOf(action({}, <T>(value: T) => value, 'hello')).toEqualTypeOf<() => string>();

// @ts-expect-error: invalid parameter type
action({}, (x: string) => x, 123);

// Extracting a value from a particular key
expectTypeOf(action({ value: 'length' }, () => 'hello')).toEqualTypeOf<() => number>();

// @ts-expect-error: invalid key
action({ value: 'len' }, () => 'hello');
