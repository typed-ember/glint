import { expectTypeOf } from 'expect-type';
import { Globals, NamedArgsMarker, resolve } from '@glint/environment-ember-loose/-private/dsl';

let outlet = resolve(Globals['outlet']);

// Named outlet
expectTypeOf(outlet('outlet-name')).toEqualTypeOf<void>();

// Nameless main outlet
outlet();

// @ts-expect-error: unexpected named args
outlet('outlet-name', {
  hello: 'hi',
  ...NamedArgsMarker,
});
