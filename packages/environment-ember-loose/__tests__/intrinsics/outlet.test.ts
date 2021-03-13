import { expectTypeOf } from 'expect-type';
import { Globals, resolve } from '@glint/environment-ember-loose/types';

let outlet = resolve(Globals['outlet']);

// Named outlet
expectTypeOf(outlet({}, 'outlet-name')).toEqualTypeOf<void>();

// Nameless main outlet
outlet({});

// @ts-expect-error: invalid named arg
outlet({ hello: 'hi' }, 'outlet-name');
