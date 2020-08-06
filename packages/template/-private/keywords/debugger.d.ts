import { NoNamedArgs } from '../signature';

export default interface DebuggerKeyword {
  (args: NoNamedArgs): void;
}
