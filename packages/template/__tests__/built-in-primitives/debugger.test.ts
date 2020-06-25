import { expectTypeOf } from 'expect-type';
import { resolve, BuiltIns, invokeInline } from '@glint/template';

const debug = resolve(BuiltIns['debugger']);

// Can be invoked as {{debugger}}
expectTypeOf(invokeInline(debug({}))).toEqualTypeOf<void>();

// @ts-expect-error: Rejects any additional arguments
debug({}, 'hello');
