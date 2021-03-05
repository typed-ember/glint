import { Invokable } from '../resolution';
import { NoNamedArgs, AcceptsBlocks } from '../signature';

export type WithKeyword = Invokable<{
  <T>(args: NoNamedArgs, value: T): AcceptsBlocks<{
    default: [T];
    inverse?: [];
  }>;
}>;
