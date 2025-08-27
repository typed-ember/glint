import { Globals, NamedArgsMarker, resolve } from '@glint/core/-private/dsl';
import { expectTypeOf } from 'expect-type';

let unbound = resolve(Globals['unbound']);

// Basic plumbing
expectTypeOf(unbound('hello')).toEqualTypeOf<string>();
expectTypeOf(unbound(123)).toEqualTypeOf<number>();

// @ts-expect-error: missing value
unbound();

// @ts-expect-error: unexpected named args
unbound('hello', {
  hello: 'hi',
  ...NamedArgsMarker,
});
