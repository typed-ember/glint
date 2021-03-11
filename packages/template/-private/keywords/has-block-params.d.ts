import { DirectInvokable } from '../resolution';
import { NoNamedArgs } from '../signature';

export type HasBlockParamsKeyword = DirectInvokable<{
  (args: NoNamedArgs, blockName?: string): boolean;
}>;
