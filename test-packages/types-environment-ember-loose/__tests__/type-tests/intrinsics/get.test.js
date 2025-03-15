import { expectTypeOf } from 'expect-type';
import { Globals, NamedArgsMarker, resolve } from '@glint/environment-ember-loose/-private/dsl';
let get = resolve(Globals['get']);
// Getting a known key
expectTypeOf(get({ foo: 'hello' }, 'foo')).toEqualTypeOf();
// Getting an unknown key
expectTypeOf(get({ foo: 'hello' }, 'baz')).toEqualTypeOf();
get({}, 'hi', 
// @ts-expect-error: invalid named arg
{ hello: 'hi', ...NamedArgsMarker });
expectTypeOf(get(maybeFoo, 'bar')).toEqualTypeOf();
expectTypeOf(get(mandatoryFoo, 'bar')).toEqualTypeOf();
expectTypeOf(get(maybeString, 'length')).toEqualTypeOf();
expectTypeOf(get(mandatoryString, 'length')).toEqualTypeOf();
expectTypeOf(get(null, 'name')).toEqualTypeOf();
expectTypeOf(get(undefined, 'name')).toEqualTypeOf();
expectTypeOf(get(proxiedObject, 'content')).toEqualTypeOf();
expectTypeOf(get(proxiedObject, 'name')).toEqualTypeOf();
expectTypeOf(get(proxiedObject, 'unknownKey')).toEqualTypeOf();
expectTypeOf(get(optionalProxiedObject, 'name')).toEqualTypeOf();
expectTypeOf(get(nullProxiedObject, 'name')).toEqualTypeOf();
expectTypeOf(get(emberArray, 'length')).toEqualTypeOf();
//# sourceMappingURL=get.test.js.map