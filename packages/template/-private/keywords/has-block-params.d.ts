import { NoNamedArgs, ReturnsValue } from '../signature';

export default interface HasBlockParamsKeyword {
  (args: NoNamedArgs, blockName?: string): ReturnsValue<boolean>;
}
