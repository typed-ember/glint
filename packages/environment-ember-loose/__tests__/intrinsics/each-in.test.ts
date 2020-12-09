import { expectTypeOf } from 'expect-type';
import { Globals, resolve, invokeBlock } from '@glint/environment-ember-loose/types';

let eachIn = resolve(Globals['each-in']);

invokeBlock(eachIn({}, { a: 5, b: 3 }), {
  default(key, value) {
    expectTypeOf(key).toEqualTypeOf<'a' | 'b'>();
    expectTypeOf(value).toEqualTypeOf<number>();
  },
});
