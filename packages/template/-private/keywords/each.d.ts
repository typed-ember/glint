import { DirectInvokable } from '../resolution';
import { AcceptsBlocks } from '../signature';

export type EachKeyword = DirectInvokable<{
  <T>(args: { key?: string }, items: T[]): AcceptsBlocks<{
    default: [T, number];
    inverse?: [];
  }>;
}>;
