import { NoNamedArgs, ReturnsValue } from '../signature';

export default interface HasBlockKeyword {
  (args: NoNamedArgs, blockName?: string): ReturnsValue<boolean>;
}
