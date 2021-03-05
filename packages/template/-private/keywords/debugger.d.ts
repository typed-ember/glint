import { Invokable } from '../resolution';
import { NoNamedArgs } from '../signature';

export type DebuggerKeyword = Invokable<{
  (args: NoNamedArgs): void;
}>;
