import {
  Globals,
  NamedArgsMarker,
  resolve,
} from '@glint/core/-private/dsl';
import { expectTypeOf } from 'expect-type';

let action = resolve(Globals['action']);

// Basic plumbing
expectTypeOf(action(() => 'hi')).toEqualTypeOf<() => string>();
// Commented out due to errors after expect-type upgrade
// expectTypeOf(action(<T>(value: T) => value)).toEqualTypeOf<{ <T>(value: T): T }>();

// Binding parameters
expectTypeOf(action((x: string, y: number) => x.padStart(y), 'hello')).toEqualTypeOf<
  (y: number) => string
>();
expectTypeOf(action((x: string, y: number) => x.padStart(y), 'hello', 123)).toEqualTypeOf<
  () => string
>();
expectTypeOf(action(<T>(value: T) => value, 'hello')).toEqualTypeOf<() => string>();

// @ts-expect-error: invalid parameter type
action((x: string) => x, 123);

// Extracting a value from a particular key
expectTypeOf(action(() => 'hello', { value: 'length', ...NamedArgsMarker })).toEqualTypeOf<
  () => number
>();
