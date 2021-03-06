import { Invokable } from '../resolution';
import { AcceptsBlocks } from '../signature';

export type EachKeyword = Invokable<{
  <T>(args: { key?: string }, items: T[]): AcceptsBlocks<{
    default: [T, number];
    inverse?: [];
  }>;
}>;
