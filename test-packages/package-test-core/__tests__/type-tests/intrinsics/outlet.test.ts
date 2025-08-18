import {
  Globals,
  NamedArgsMarker,
  resolve,
} from '@glint/core/environment-ember-template-imports/-private/dsl';
import { expectTypeOf } from 'expect-type';

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
