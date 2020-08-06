import { NoNamedArgs } from '../signature';

export default interface HasBlockKeyword {
  (args: NoNamedArgs, blockName?: string): boolean;
}
