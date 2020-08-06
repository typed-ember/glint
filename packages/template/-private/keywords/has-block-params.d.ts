import { NoNamedArgs } from '../signature';

export default interface HasBlockParamsKeyword {
  (args: NoNamedArgs, blockName?: string): boolean;
}
