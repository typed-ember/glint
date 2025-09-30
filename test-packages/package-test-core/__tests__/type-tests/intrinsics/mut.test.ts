import { Globals, NamedArgsMarker, resolve } from '@glint/ember-tsc/-private/dsl';
import type { Mut } from '@glint/ember-tsc/-private/intrinsics/mut';
import { expectTypeOf } from 'expect-type';

let mut = resolve(Globals['mut']);

// Basic plumbing
expectTypeOf(mut('hello')).toEqualTypeOf<Mut<string>>();

// @ts-expect-error: missing value
mut();

// @ts-expect-error: unexpected named args
mut('hello', {
  hello: 'hi',
  ...NamedArgsMarker,
});
