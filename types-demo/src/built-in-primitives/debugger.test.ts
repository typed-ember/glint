import { expectType, expectError } from 'tsd';
import { resolve, BuiltIns, invokeInline } from '@gleam/core';

const debug = resolve(BuiltIns['debugger']);

// Can be invoked as {{debugger}}
expectType<void>(invokeInline(debug({})));

// Rejects any additional arguments
expectError(debug({}, 'hello'));
