import { expectTypeOf } from 'expect-type';
import { Globals, resolve } from '@glint/environment-ember-loose/types';

let get = resolve(Globals['get']);

// Getting a known key
expectTypeOf(get({}, { foo: 'hello' }, 'foo')).toEqualTypeOf<string>();

// Getting an unknown key
expectTypeOf(get({}, { foo: 'hello' }, 'baz')).toEqualTypeOf<unknown>();

get(
  {
    // @ts-expect-error: invalid named arg
    hello: 'hi',
  },
  {},
  'hi'
);
