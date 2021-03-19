import { invokeEmit, resolve } from '../../-private/dsl';
import { DebuggerKeyword } from '../../-private/keywords';

const debuggerKeyword = resolve({} as DebuggerKeyword);

// Can be invoked as {{debugger}}
invokeEmit(debuggerKeyword({}));

// @ts-expect-error: Rejects any additional arguments
debuggerKeyword({}, 'hello');
