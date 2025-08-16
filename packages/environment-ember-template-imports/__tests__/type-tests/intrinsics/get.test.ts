import EmberArray from '@ember/array';
import ObjectProxy from '@ember/object/proxy';
import {
  Globals,
  NamedArgsMarker,
  resolve,
} from '@glint/environment-ember-template-imports/-private/dsl';
import { expectTypeOf } from 'expect-type';

let get = resolve(Globals['get']);

// Getting a known key
expectTypeOf(get({ foo: 'hello' }, 'foo')).toEqualTypeOf<string>();

// Getting an unknown key
expectTypeOf(get({ foo: 'hello' }, 'baz')).toEqualTypeOf<unknown>();

get(
  {},
  'hi',
  // @ts-expect-error: invalid named arg
  { hello: 'hi', ...NamedArgsMarker },
);

interface Foo {
  readonly [key: string]: number | undefined;
}

declare const maybeFoo: Foo | undefined;
expectTypeOf(get(maybeFoo, 'bar')).toEqualTypeOf<number | undefined>();

declare const mandatoryFoo: Foo;
expectTypeOf(get(mandatoryFoo, 'bar')).toEqualTypeOf<number | undefined>();

declare const maybeString: string | undefined;
expectTypeOf(get(maybeString, 'length')).toEqualTypeOf<number | undefined>();

declare const mandatoryString: string;
expectTypeOf(get(mandatoryString, 'length')).toEqualTypeOf<number>();

expectTypeOf(get(null, 'name')).toEqualTypeOf<undefined>();
expectTypeOf(get(undefined, 'name')).toEqualTypeOf<undefined>();

// Getting a value off an ObjectProxy
declare const proxiedObject: ObjectProxy<{ name: string }>;

expectTypeOf(get(proxiedObject, 'content')).toEqualTypeOf<{ name: string } | null>();
expectTypeOf(get(proxiedObject, 'name')).toEqualTypeOf<string | undefined>();
expectTypeOf(get(proxiedObject, 'unknownKey')).toEqualTypeOf<unknown>();

declare const optionalProxiedObject: ObjectProxy<{ name: string }> | undefined;

expectTypeOf(get(optionalProxiedObject, 'name')).toEqualTypeOf<string | undefined>();

declare const nullProxiedObject: ObjectProxy<{ name: string }> | null;

expectTypeOf(get(nullProxiedObject, 'name')).toEqualTypeOf<string | undefined>();

declare const emberArray: EmberArray<any>;

expectTypeOf(get(emberArray, 'length')).toEqualTypeOf<number>();
