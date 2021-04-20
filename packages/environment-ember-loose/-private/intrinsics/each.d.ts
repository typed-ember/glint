import { AcceptsBlocks, DirectInvokable } from '@glint/template/-private/integration';
import EmberArray from '@ember/array';

type ArrayLike<T> = ReadonlyArray<T> | Iterable<T> | EmberArray<T>;

export type EachKeyword = DirectInvokable<{
  <T = any>(args: { key?: string }, items: ArrayLike<T> | null | undefined): AcceptsBlocks<{
    default: [T, number];
    inverse: [];
  }>;
}>;
