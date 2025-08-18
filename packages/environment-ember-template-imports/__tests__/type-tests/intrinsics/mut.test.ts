import {
  Globals,
  NamedArgsMarker,
  resolve,
} from '@glint/environment-ember-template-imports/-private/dsl';
import { expectTypeOf } from 'expect-type';
import { Mut } from '../../../-private/intrinsics/mut';

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
