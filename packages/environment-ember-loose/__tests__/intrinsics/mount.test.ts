import { expectTypeOf } from 'expect-type';
import { Globals, resolve } from '@glint/environment-ember-loose/types';

let mount = resolve(Globals['mount']);

// Basic plumbing
expectTypeOf(mount({}, 'engine-name')).toEqualTypeOf<void>();

// @ts-expect-error: missing engine name
mount({});

// @ts-expect-error: invalid named arg
mount({ hello: 'hi' }, 'engine-name');
