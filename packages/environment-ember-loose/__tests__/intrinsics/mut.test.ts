import { expectTypeOf } from 'expect-type';
import { Globals, resolve } from '@glint/environment-ember-loose/-private/dsl';
import { Mut } from '@glint/environment-ember-loose/-private/intrinsics/mut';

let fn = resolve(Globals['fn']);
let mut = resolve(Globals['mut']);

// Basic plumbing
expectTypeOf(mut({}, 'hello')).toEqualTypeOf<Mut<string>>();

// `{{fn (mut this.value)}}` returns an updater
expectTypeOf(fn({}, mut({}, 'hello'))).toEqualTypeOf<(value: string) => void>();

// @ts-expect-error: missing value
mut({});

// @ts-expect-error: invalid named arg
mut({ hello: 'hi' }, 'hello');
