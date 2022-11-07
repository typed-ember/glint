import { expectTypeOf } from 'expect-type';
import { Globals, NamedArgsMarker, resolve } from '@glint/environment-ember-loose/-private/dsl';

let uniqueId = resolve(Globals['unique-id']);

// Basic plumbing
expectTypeOf(uniqueId()).toEqualTypeOf<string>();

uniqueId({
  // @ts-expect-error: invalid named arg
  hello: 'hi',
  ...NamedArgsMarker,
});

// @ts-expect-error: invalid positional arg
uniqueId('hi');
