import { uniqueId as uniqueIdImport } from '@ember/helper';
import { NamedArgsMarker, resolve } from '@glint/core/-private/dsl';
import { expectTypeOf } from 'expect-type';

let uniqueId = resolve(uniqueIdImport);

// Basic plumbing
expectTypeOf(uniqueId()).toEqualTypeOf<string>();

// @ts-expect-error: unexpected named args
uniqueId({
  hello: 'hi',
  ...NamedArgsMarker,
});

// @ts-expect-error: invalid positional arg
uniqueId('hi');
