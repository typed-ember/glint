import { expectTypeOf } from 'expect-type';
import { Globals, resolve } from '@glint/environment-ember-loose/types';

let unbound = resolve(Globals['unbound']);

// Basic plumbing
expectTypeOf(unbound({}, 'hello')).toEqualTypeOf<string>();
expectTypeOf(unbound({}, 123)).toEqualTypeOf<number>();

// @ts-expect-error: missing value
unbound({});

// @ts-expect-error: invalid named arg
unbound({ hello: 'hi' }, 'hello');
