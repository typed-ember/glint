import { expectTypeOf } from 'expect-type';
import {
  Globals,
  resolve,
  emitComponent,
  bindBlocks,
} from '@glint/environment-ember-loose/-private/dsl';
import ArrayProxy from '@ember/array/proxy';

let each = resolve(Globals['each']);

// Yield out array values and indices

emitComponent(each({}, ['a', 'b', 'c']), (component) =>
  bindBlocks(component.blockParams, {
    default(value, index) {
      expectTypeOf(value).toEqualTypeOf<string>();
      expectTypeOf(index).toEqualTypeOf<number>();
    },
    inverse(...args) {
      expectTypeOf(args).toEqualTypeOf<[]>();
    },
  })
);

// Works for Ember arrays

declare const proxiedArray: ArrayProxy<string>;

emitComponent(each({}, proxiedArray), (component) =>
  bindBlocks(component.blockParams, {
    default(value, index) {
      expectTypeOf(value).toEqualTypeOf<string>();
      expectTypeOf(index).toEqualTypeOf<number>();
    },
  })
);

// Works for other iterables

emitComponent(each({}, new Map<string, symbol>()), (component) =>
  bindBlocks(component.blockParams, {
    default([key, value], index) {
      expectTypeOf(key).toEqualTypeOf<string>();
      expectTypeOf(value).toEqualTypeOf<symbol>();
      expectTypeOf(index).toEqualTypeOf<number>();
    },
  })
);

// Works for `readonly` arrays

emitComponent(each({}, ['a', 'b', 'c'] as readonly string[]), (component) =>
  bindBlocks(component.blockParams, {
    default(value, index) {
      expectTypeOf(value).toEqualTypeOf<string>();
      expectTypeOf(index).toEqualTypeOf<number>();
    },
  })
);

// Accept a `key` string
emitComponent(each({ key: 'id' }, [{ id: 1 }]), (component) =>
  bindBlocks(component.blockParams, {
    default(value, index) {
      expectTypeOf(value).toEqualTypeOf<{ id: number }>();
      expectTypeOf(index).toEqualTypeOf<number>();
    },
  })
);

declare const arrayOrUndefined: string[] | undefined;

// Works for undefined
emitComponent(each({}, arrayOrUndefined), (component) =>
  bindBlocks(component.blockParams, {
    default(value, index) {
      expectTypeOf(value).toEqualTypeOf<string>();
      expectTypeOf(index).toEqualTypeOf<number>();
    },
  })
);

declare const arrayOrNull: string[] | null;

// Works for null
emitComponent(each({}, arrayOrNull), (component) =>
  bindBlocks(component.blockParams, {
    default(value, index) {
      expectTypeOf(value).toEqualTypeOf<string>();
      expectTypeOf(index).toEqualTypeOf<number>();
    },
  })
);
