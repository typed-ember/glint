import { expectTypeOf } from 'expect-type';
import { resolve, BuiltIns, invokeInline } from '@glint/template';

const concat = resolve(BuiltIns['concat']);

// No args returns a string
expectTypeOf(invokeInline(concat({}))).toEqualTypeOf<string>();

// String args returns a string
expectTypeOf(invokeInline(concat({}, 'hello', 'world'))).toEqualTypeOf<string>();

// @ts-expect-error: Only strings are accepted
concat({}, 1, 2);
