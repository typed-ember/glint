import { AcceptsBlocks, DirectInvokable } from '../integration';

export type EachKeyword = DirectInvokable<{
  <T>(args: { key?: string }, items: readonly T[]): AcceptsBlocks<{
    default: [T, number];
    else?: [];
  }>;
}>;
