import { AcceptsBlocks, DirectInvokable } from '../integration';

export type EachKeyword = DirectInvokable<{
  <T>(args: { key?: string }, items: T[]): AcceptsBlocks<{
    default: [T, number];
    inverse?: [];
  }>;
}>;
