import '@glint/template/ember';
import Helper, { helper } from '@ember/component/helper';
import { resolve, invokeInline } from '@glint/template';
import { expectTypeOf } from 'expect-type';

// Type parameters can be persisted for functional helpers
const id = resolve(helper(<T>([value]: [T]) => value));

// For class-based, unfortunately, they can't, because there's an intervening object type
const hello = resolve(
  class HelloHelper extends Helper {
    compute(_: [], { target }: { target: string }): string {
      return `Hello, ${target}`;
    }
  }
);

// Correct parametrized type for a functional helper
expectTypeOf(invokeInline(id({}, 'hello'))).toEqualTypeOf<string>();
expectTypeOf(invokeInline(id({}, 123))).toEqualTypeOf<number>();

// Correct type for a class-based helper
expectTypeOf(invokeInline(hello({ target: 'world' }))).toEqualTypeOf<string>();

// @ts-expect-error: Missing positional param
invokeInline(id({}));

// @ts-expect-error: Invalid named param
invokeInline(hello({ target: 'world', foo: true }));

// @ts-expect-error: Named param when none are expected
invokeInline(id({ key: 'value' }, 'hello'));
