import EmberArray from '@ember/array';
import { ComponentLike } from '@glint/template';
import { ComponentReturn, DirectInvokable, NamedArgs } from '@glint/template/-private/integration';

type ArrayLike<T> = ReadonlyArray<T> | Iterable<T> | EmberArray<T>;

type EachKeywordClass = abstract new <T = any>() => InstanceType<
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

// A direct call signature, so templates don't instantiate the component class
// for every item type.
type EachKeywordCall = DirectInvokable<
  <T = any>(
    items: ArrayLike<T> | null | undefined,
    named?: NamedArgs<{ key?: string }>,
  ) => ComponentReturn<{ default: [T, number]; else: [] }>
>;

export interface EachKeyword extends EachKeywordClass, EachKeywordCall {}
