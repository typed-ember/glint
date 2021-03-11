import { DirectInvokable } from '../resolution';
import { NoNamedArgs } from '../signature';

export type HasBlockKeyword = DirectInvokable<{
  (args: NoNamedArgs, blockName?: string): boolean;
}>;
