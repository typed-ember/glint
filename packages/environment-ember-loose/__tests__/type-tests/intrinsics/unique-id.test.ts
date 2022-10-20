import { expectTypeOf } from 'expect-type';
import { Globals, resolve } from '@glint/environment-ember-loose/-private/dsl';

let uniqueId = resolve(Globals['unique-id']);

// Basic plumbing
expectTypeOf(uniqueId({})).toEqualTypeOf<string>();

// @ts-expect-error: invalid named arg
uniqueId({ hello: 'hi' });

// @ts-expect-error: invalid positional arg
uniqueId({}, 'hi');
