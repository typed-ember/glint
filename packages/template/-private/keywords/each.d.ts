import { AcceptsBlocks } from '../signature';

export default interface EachKeyword {
  <T>(args: { key?: string }, items: T[]): AcceptsBlocks<{
    default: [T, number];
    inverse?: [];
  }>;
}
