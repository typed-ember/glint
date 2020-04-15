import { expectType, expectError } from 'tsd';
import { resolve, BuiltIns, invokeInline } from '@gleam/core';

const concat = resolve(BuiltIns['concat']);

// No args returns a string
expectType<string>(invokeInline(concat({})));

// String args returns a string
expectType<string>(invokeInline(concat({}, 'hello', 'world')));

// Only strings are accepted
expectError(concat({}, 1, 2));
