import { expectTypeOf } from 'expect-type';
import { Globals, NamedArgsMarker, resolve } from '@glint/environment-ember-loose/-private/dsl';

let uniqueId = resolve(Globals['unique-id']);

// Basic plumbing
expectTypeOf(uniqueId()).toEqualTypeOf<string>();

// @ts-expect-error: unexpected named args
uniqueId({
  hello: 'hi',
  ...NamedArgsMarker,
});

// @ts-expect-error: invalid positional arg
uniqueId('hi');
