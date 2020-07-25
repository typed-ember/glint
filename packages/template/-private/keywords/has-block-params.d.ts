import { NoNamedArgs, ReturnsValue } from '../signature';

export default interface HasBlocParamskKeyword {
  (args: NoNamedArgs, blockName?: string): ReturnsValue<boolean>;
}
