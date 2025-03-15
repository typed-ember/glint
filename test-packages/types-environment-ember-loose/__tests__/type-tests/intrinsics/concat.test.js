import { expectTypeOf } from 'expect-type';
import { Globals, resolve } from '@glint/environment-ember-loose/-private/dsl';
let concat = resolve(Globals['concat']);
// Basic plumbing
expectTypeOf(concat()).toEqualTypeOf();
expectTypeOf(concat(1, true, 'three')).toEqualTypeOf();
//# sourceMappingURL=concat.test.js.map