import { expectTypeOf } from 'expect-type';
import { Globals, resolve } from '@glint/environment-ember-loose/-private/dsl';
import ObjectProxy from '@ember/object/proxy';

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

// Getting a value off an ObjectProxy
declare const proxiedObject: ObjectProxy<{ name: string }>;

expectTypeOf(get({}, proxiedObject, 'content')).toEqualTypeOf<{ name: string }>();
expectTypeOf(get({}, proxiedObject, 'name')).toEqualTypeOf<string>();
expectTypeOf(get({}, proxiedObject, 'unknownKey')).toEqualTypeOf<unknown>();
