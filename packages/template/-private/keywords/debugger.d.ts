import { DirectInvokable } from '../resolution';
import { NoNamedArgs } from '../signature';

export type DebuggerKeyword = DirectInvokable<{
  (args: NoNamedArgs): void;
}>;
