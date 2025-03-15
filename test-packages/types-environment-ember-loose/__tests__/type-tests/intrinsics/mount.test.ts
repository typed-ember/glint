import { expectTypeOf } from 'expect-type';
import { Globals, NamedArgsMarker, resolve } from '@glint/environment-ember-loose/-private/dsl';

let mount = resolve(Globals['mount']);

// Basic plumbing
expectTypeOf(mount('engine-name')).toEqualTypeOf<void>();
expectTypeOf(mount('engine-name', { model: {}, ...NamedArgsMarker }));

// @ts-expect-error: missing engine name
mount();

// @ts-expect-error: invalid named arg
mount('engine-name', { hello: 'hi', ...NamedArgsMarker });
