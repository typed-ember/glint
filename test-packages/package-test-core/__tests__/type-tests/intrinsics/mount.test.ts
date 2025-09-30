import { Globals, NamedArgsMarker, resolve } from '@glint/ember-tsc/-private/dsl';
import { expectTypeOf } from 'expect-type';

let mount = resolve(Globals['mount']);

// Basic plumbing
expectTypeOf(mount('engine-name')).toEqualTypeOf<void>();
expectTypeOf(mount('engine-name', { model: {}, ...NamedArgsMarker }));

// @ts-expect-error: missing engine name
mount();

// @ts-expect-error: invalid named arg
mount('engine-name', { hello: 'hi', ...NamedArgsMarker });
