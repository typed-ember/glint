import { ComponentLike } from '@glint/template';
import { ComponentReturn, DirectInvokable, NamedArgs } from '@glint/template/-private/integration';

type EachInKeywordClass = abstract new <T>() => InstanceType<
  ComponentLike<{
    Args: {
      Positional: [object: T];
      Named: { key?: string };
    };
    Blocks: {
      default: EachInIteratorPair<T>;
      else?: [];
    };
  }>
>;

// A direct call signature, so templates don't instantiate the component class
// for every object type. Iterables and plain objects get their own overloads,
// because a conditional type on a generic `T` stays deferred, and TS checks it
// through both of its branches.
type EachInKeywordCall = DirectInvokable<{
  <K, V>(
    object: Iterable<[K, V]> | null | undefined,
    named?: NamedArgs<{ key?: string }>,
  ): EachInBlocks<[key: K, value: V]>;
  <T extends NotIterable>(
    object: T,
    named?: NamedArgs<{ key?: string }>,
  ): EachInBlocks<[key: EachInKey<T>, value: Exclude<T, null | undefined>[EachInKey<T>]]>;
  // A union of an iterable and an object, or a `T` with no constraint, which
  // keeps the `any` block params it had before.
  <T>(
    object: T,
    named?: NamedArgs<{ key?: string }>,
  ): EachInBlocks<unknown extends T ? [key: any, value: any] : EachInIteratorPair<T>>;
}>;

type EachInBlocks<Params extends unknown[]> = ComponentReturn<{ default: Params; else?: [] }>;

type NotIterable = { [Symbol.iterator]?: never } | null | undefined;

export interface EachInKeyword extends EachInKeywordClass, EachInKeywordCall {}

type EachInIteratorPair<T> =
  T extends Iterable<[infer K, infer V]>
    ? [key: K, value: V]
    : [key: EachInKey<T>, value: Exclude<T, null | undefined>[EachInKey<T>]];

// `{{each-in}}` internally uses `Object.keys`, so only string keys are included
// TS, on the other hand, gives a wider result for `keyof` than many users expect
// for record types: https://github.com/microsoft/TypeScript/issues/29249
type EachInKey<T> = Extract<keyof Exclude<T, null | undefined>, string>;
