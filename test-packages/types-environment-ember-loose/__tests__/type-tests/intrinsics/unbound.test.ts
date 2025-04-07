import { expectTypeOf } from 'expect-type';
import { Globals, NamedArgsMarker, resolve } from '@glint/environment-ember-loose/-private/dsl';

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
