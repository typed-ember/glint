import { DirectInvokable } from '../resolution';
import { NoNamedArgs, AcceptsBlocks } from '../signature';

export type WithKeyword = DirectInvokable<{
  <T>(args: NoNamedArgs, value: T): AcceptsBlocks<{
    default: [T];
    inverse?: [];
  }>;
}>;
