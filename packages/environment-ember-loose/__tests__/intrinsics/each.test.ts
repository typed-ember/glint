import { expectTypeOf } from 'expect-type';
import { Globals, resolve, invokeBlock } from '@glint/environment-ember-loose/-private/dsl';
import ArrayProxy from '@ember/array/proxy';

let each = resolve(Globals['each']);

// Yield out array values and indices

invokeBlock(each({}, ['a', 'b', 'c']), {
  default(value, index) {
    expectTypeOf(value).toEqualTypeOf<string>();
    expectTypeOf(index).toEqualTypeOf<number>();
  },
  inverse(...args) {
    expectTypeOf(args).toEqualTypeOf<[]>();
  },
});

// Works for Ember arrays

declare const proxiedArray: ArrayProxy<string>;

invokeBlock(each({}, proxiedArray), {
  default(value, index) {
    expectTypeOf(value).toEqualTypeOf<string>();
    expectTypeOf(index).toEqualTypeOf<number>();
  },
});

// Works for other iterables

invokeBlock(each({}, new Map<string, symbol>()), {
  default([key, value], index) {
    expectTypeOf(key).toEqualTypeOf<string>();
    expectTypeOf(value).toEqualTypeOf<symbol>();
    expectTypeOf(index).toEqualTypeOf<number>();
  },
});

// Works for `readonly` arrays

invokeBlock(each({}, ['a', 'b', 'c'] as readonly string[]), {
  default(value, index) {
    expectTypeOf(value).toEqualTypeOf<string>();
    expectTypeOf(index).toEqualTypeOf<number>();
  },
});

// Accept a `key` string
invokeBlock(each({ key: 'id' }, [{ id: 1 }]), {
  default() {
    // Don't yield
  },
});
