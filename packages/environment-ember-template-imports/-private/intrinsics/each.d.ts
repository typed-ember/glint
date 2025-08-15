import EmberArray from '@ember/array';
import { ComponentLike } from '@glint/template';

type ArrayLike<T> = ReadonlyArray<T> | Iterable<T> | EmberArray<T>;

export type EachKeyword = abstract new <T = any>() => InstanceType<
  ComponentLike<{
    Args: {
      Positional: [items: ArrayLike<T> | null | undefined];
      Named: { key?: string };
    };
    Blocks: {
      default: [T, number];
      else: [];
    };
  }>
>;
