import { Invokable } from '../resolution';
import { NoNamedArgs } from '../signature';

export type HasBlockParamsKeyword = Invokable<{
  (args: NoNamedArgs, blockName?: string): boolean;
}>;
