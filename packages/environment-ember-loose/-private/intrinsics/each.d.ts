import { AcceptsBlocks, DirectInvokable } from '@glint/template/-private/integration';
import EmberArray from '@ember/array';

type ArrayLike<T> = ReadonlyArray<T> | Iterable<T> | EmberArray<T>;

export type EachKeyword = DirectInvokable<{
  <T>(args: { key?: string }, items: ArrayLike<T>): AcceptsBlocks<{
    default: [T, number];
    inverse?: [];
  }>;
}>;
