import { expectTypeOf } from 'expect-type';
import { Globals, NamedArgsMarker, resolve } from '@glint/environment-ember-loose/-private/dsl';
let fn = resolve(Globals['fn']);
let mut = resolve(Globals['mut']);
// Basic plumbing
expectTypeOf(mut('hello')).toEqualTypeOf();
// `{{fn (mut this.value)}}` returns an updater
expectTypeOf(fn(mut('hello'))).toEqualTypeOf();
// @ts-expect-error: missing value
mut();
// @ts-expect-error: unexpected named args
mut('hello', {
    hello: 'hi',
    ...NamedArgsMarker,
});
//# sourceMappingURL=mut.test.js.map