import { expectTypeOf } from 'expect-type';
import { resolve, invokeInline } from '@glint/template';
import { DebuggerKeyword } from '@glint/template/-private/keywords';

const debuggerKeyword = resolve({} as DebuggerKeyword);

// Can be invoked as {{debugger}}
expectTypeOf(invokeInline(debuggerKeyword({}))).toEqualTypeOf<void>();

// @ts-expect-error: Rejects any additional arguments
debuggerKeyword({}, 'hello');
