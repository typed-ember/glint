import { DirectInvokable } from '../resolution';
import { NoNamedArgs, AcceptsBlocks } from '../signature';

export type LetKeyword = DirectInvokable<{
  <T extends unknown[]>(args: NoNamedArgs, ...values: T): AcceptsBlocks<{
    default: T;
  }>;
}>;
