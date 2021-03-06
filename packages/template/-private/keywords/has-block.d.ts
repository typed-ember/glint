import { Invokable } from '../resolution';
import { NoNamedArgs } from '../signature';

export type HasBlockKeyword = Invokable<{
  (args: NoNamedArgs, blockName?: string): boolean;
}>;
