import { ComponentLike } from '@glint/template';
import { ComponentReturn, DirectInvokable, NamedArgs } from '@glint/template/-private/integration';

type EachInKeywordClass = abstract new <T>() => InstanceType<
  ComponentLike<{
    Args: {
      Positional: [object: T];
      Named: { key?: string };
    };
    Blocks: {
      default: [key: EachInBlockKey<T>, value: EachInBlockValue<T>];
      else?: [];
    };
  }>
>;

// A direct call signature, so templates don't instantiate the component class
// for every object type.
type EachInKeywordCall = DirectInvokable<
  <T>(
    object: T,
    named?: NamedArgs<{ key?: string }>,
  ) => ComponentReturn<{
    default: [key: EachInBlockKey<T>, value: EachInBlockValue<T>];
    else?: [];
  }>
>;

export interface EachInKeyword extends EachInKeywordClass, EachInKeywordCall {}

// The block params are a tuple, not a conditional type, so that a generic `T`
// does not make them `unknown`. The `NotIterable` check comes first so that a
// generic `T extends object`, which TS checks through its constraint, gets
// `string` keys. `{}` (which also allows primitives) keeps `never` keys.
type NotIterable = { [Symbol.iterator]?: never } | null | undefined;

type EachInBlockKey<T> = T extends NotIterable
  ? [EachInKey<T>] extends [never]
    ? T extends object
      ? string extends T
        ? never
        : string
      : never
    : EachInKey<T>
  : EachInIteratorPair<T>[0];

type EachInBlockValue<T> = T extends NotIterable
  ? Exclude<T, null | undefined>[EachInKey<T>]
  : EachInIteratorPair<T>[1];

type EachInIteratorPair<T> =
  T extends Iterable<[infer K, infer V]>
    ? [key: K, value: V]
    : [key: EachInKey<T>, value: Exclude<T, null | undefined>[EachInKey<T>]];

// `{{each-in}}` internally uses `Object.keys`, so only string keys are included
// TS, on the other hand, gives a wider result for `keyof` than many users expect
// for record types: https://github.com/microsoft/TypeScript/issues/29249
type EachInKey<T> = Extract<keyof Exclude<T, null | undefined>, string>;
