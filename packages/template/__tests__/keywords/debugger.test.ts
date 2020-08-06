import { resolve, invokeEmit } from '@glint/template';
import { DebuggerKeyword } from '@glint/template/-private/keywords';

const debuggerKeyword = resolve({} as DebuggerKeyword);

// Can be invoked as {{debugger}}
invokeEmit(debuggerKeyword({}));

// @ts-expect-error: Rejects any additional arguments
debuggerKeyword({}, 'hello');
