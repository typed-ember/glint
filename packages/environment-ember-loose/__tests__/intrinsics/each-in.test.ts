import { expectTypeOf } from 'expect-type';
import { Globals, resolve, invokeBlock } from '@glint/environment-ember-loose/-private/dsl';

let eachIn = resolve(Globals['each-in']);

invokeBlock(eachIn({}, { a: 5, b: 3 }), {
  default(key, value) {
    expectTypeOf(key).toEqualTypeOf<'a' | 'b'>();
    expectTypeOf(value).toEqualTypeOf<number>();
  },
});

// Can render maybe undefined

declare const maybeVal: { a: number; b: number } | undefined;

invokeBlock(eachIn({}, maybeVal), {
  default(key, value) {
    expectTypeOf(key).toEqualTypeOf<'a' | 'b'>();
    expectTypeOf(value).toEqualTypeOf<number>();
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  inverse(..._args: never) {
    // This block receives no args
  },
});

// Can render inverse when undefined, null, or empty.

invokeBlock(eachIn({}, undefined), {
  default(key, value) {
    // This won't get called when no value, but gets default for keyof
    expectTypeOf(key).toEqualTypeOf<string | number | symbol>();
    expectTypeOf(value).toEqualTypeOf<never>();
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  inverse(..._args: never) {
    // This block receives no args
  },
});

invokeBlock(eachIn({}, null), {
  default(key, value) {
    // This won't get called when no value, but gets default for keyof
    expectTypeOf(key).toEqualTypeOf<string | number | symbol>();
    expectTypeOf(value).toEqualTypeOf<never>();
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  inverse(..._args: never) {
    // This block receives no args
  },
});

invokeBlock(eachIn({}, {}), {
  default(key, value) {
    // This won't get called when no value
    expectTypeOf(key).toEqualTypeOf<never>();
    expectTypeOf(value).toEqualTypeOf<never>();
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  inverse(..._args: never) {
    // This block receives no args
  },
});
