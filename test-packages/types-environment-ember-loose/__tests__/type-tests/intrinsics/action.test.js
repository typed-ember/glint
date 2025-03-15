import { expectTypeOf } from 'expect-type';
import { Globals, NamedArgsMarker, resolve } from '@glint/environment-ember-loose/-private/dsl';
let action = resolve(Globals['action']);
// Basic plumbing
expectTypeOf(action(() => 'hi')).toEqualTypeOf();
expectTypeOf(action((value) => value)).toEqualTypeOf();
// Binding parameters
expectTypeOf(action((x, y) => x.padStart(y), 'hello')).toEqualTypeOf();
expectTypeOf(action((x, y) => x.padStart(y), 'hello', 123)).toEqualTypeOf();
expectTypeOf(action((value) => value, 'hello')).toEqualTypeOf();
// @ts-expect-error: invalid parameter type
action((x) => x, 123);
// Extracting a value from a particular key
expectTypeOf(action(() => 'hello', { value: 'length', ...NamedArgsMarker })).toEqualTypeOf();
//# sourceMappingURL=action.test.js.map