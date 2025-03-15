import { expectTypeOf } from 'expect-type';
import { Globals, resolve } from '@glint/environment-ember-loose/-private/dsl';
let fn = resolve(Globals['fn']);
// @ts-expect-error: invalid arg
fn((t) => t, 123);
expectTypeOf(fn(() => true)).toEqualTypeOf();
expectTypeOf(fn((arg) => arg.length)).toEqualTypeOf();
expectTypeOf(fn((arg) => arg.length, 'hi')).toEqualTypeOf();
let identity = (x) => x;
// Bound type parameters are reflected in the output
expectTypeOf(fn(identity, 'hi')).toEqualTypeOf();
// Unbound type parameters survive to the output
expectTypeOf(fn(identity)).toEqualTypeOf();
//# sourceMappingURL=fn.test.js.map