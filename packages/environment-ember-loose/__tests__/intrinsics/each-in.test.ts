import { expectTypeOf } from 'expect-type';
import {
  emitComponent,
  Globals,
  bindBlocks,
  resolve,
} from '@glint/environment-ember-loose/-private/dsl';

let eachIn = resolve(Globals['each-in']);

emitComponent(eachIn({}, { a: 5, b: 3 }), (component) =>
  bindBlocks(component.blockParams, {
    default(key, value) {
      expectTypeOf(key).toEqualTypeOf<'a' | 'b'>();
      expectTypeOf(value).toEqualTypeOf<number>();
    },
  })
);

// Can render maybe undefined

declare const maybeVal: { a: number; b: number } | undefined;

emitComponent(eachIn({}, maybeVal), (component) =>
  bindBlocks(component.blockParams, {
    default(key, value) {
      expectTypeOf(key).toEqualTypeOf<'a' | 'b'>();
      expectTypeOf(value).toEqualTypeOf<number>();
    },
    inverse(...args) {
      expectTypeOf(args).toEqualTypeOf<[]>();
    },
  })
);

// Can render inverse when undefined, null, or empty.

emitComponent(eachIn({}, undefined), (component) =>
  bindBlocks(component.blockParams, {
    default(key, value) {
      // This won't get called when no value, but gets default for keyof
      expectTypeOf(key).toEqualTypeOf<string | number | symbol>();
      expectTypeOf(value).toEqualTypeOf<never>();
    },
    inverse(...args) {
      expectTypeOf(args).toEqualTypeOf<[]>();
    },
  })
);

emitComponent(eachIn({}, null), (component) =>
  bindBlocks(component.blockParams, {
    default(key, value) {
      // This won't get called when no value, but gets default for keyof
      expectTypeOf(key).toEqualTypeOf<string | number | symbol>();
      expectTypeOf(value).toEqualTypeOf<never>();
    },
    inverse(...args) {
      expectTypeOf(args).toEqualTypeOf<[]>();
    },
  })
);

emitComponent(eachIn({}, {}), (component) =>
  bindBlocks(component.blockParams, {
    default(key, value) {
      // This won't get called when no value
      expectTypeOf(key).toEqualTypeOf<never>();
      expectTypeOf(value).toEqualTypeOf<never>();
    },
    inverse(...args) {
      expectTypeOf(args).toEqualTypeOf<[]>();
    },
  })
);
