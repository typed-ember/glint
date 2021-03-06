import { Invokable } from '../resolution';
import { NoNamedArgs, AcceptsBlocks } from '../signature';

export type LetKeyword = Invokable<{
  <T extends unknown[]>(args: NoNamedArgs, ...values: T): AcceptsBlocks<{
    default: T;
  }>;
}>;
