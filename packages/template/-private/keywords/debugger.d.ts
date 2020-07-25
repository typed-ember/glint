import { NoNamedArgs, ReturnsValue } from '../signature';

export default interface DebuggerKeyword {
  (args: NoNamedArgs): ReturnsValue<void>;
}
