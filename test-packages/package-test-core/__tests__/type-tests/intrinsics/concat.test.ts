import { concat as concatImport } from '@ember/helper';
import { resolve } from '@glint/ember-tsc/-private/dsl';
import { expectTypeOf } from 'expect-type';

let concat = resolve(concatImport);

// Basic plumbing
expectTypeOf(concat()).toEqualTypeOf<string>();
expectTypeOf(concat(1, true, 'three')).toEqualTypeOf<string>();
