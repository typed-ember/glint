import { expectTypeOf } from 'expect-type';
import { Globals, NamedArgsMarker, resolve } from '@glint/environment-ember-loose/-private/dsl';

let unbound = resolve(Globals['unbound']);

// Basic plumbing
expectTypeOf(unbound('hello')).toEqualTypeOf<string>();
expectTypeOf(unbound(123)).toEqualTypeOf<number>();

// @ts-expect-error: missing value
unbound();

unbound('hello', {
  // @ts-expect-error: invalid named arg
  hello: 'hi',
  ...NamedArgsMarker,
});
