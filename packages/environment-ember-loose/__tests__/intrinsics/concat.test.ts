import { expectTypeOf } from 'expect-type';
import { Globals, resolve } from '@glint/environment-ember-loose/types';

let concat = resolve(Globals['concat']);

// Basic plumbing
expectTypeOf(concat({})).toEqualTypeOf<string>();
expectTypeOf(concat({}, 1, true, 'three')).toEqualTypeOf<string>();

// @ts-expect-error: invalid named arg
concat({ hello: 'hi' });
