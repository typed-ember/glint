import { AcceptsBlocks, DirectInvokable, EmptyObject } from '../integration';

export type WithKeyword = DirectInvokable<{
  <T>(args: EmptyObject, value: T): AcceptsBlocks<{
    default: [T];
    else?: [];
  }>;
}>;
