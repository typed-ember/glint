import { ComponentLike } from '@glint/template';

export type EachInKeyword = abstract new <T>() => InstanceType<
  ComponentLike<{
    Args: {
      Positional: [object: T];
      Named: { key?: string };
    };
    Blocks: {
      default: [key: EachInKey<T>, value: Exclude<T, null | undefined>[EachInKey<T>]];
      else?: [];
    };
  }>
>;

// `{{each-in}}` internally uses `Object.keys`, so only string keys are included
// TS, on the other hand, gives a wider result for `keyof` than many users expect
// for record types: https://github.com/microsoft/TypeScript/issues/29249
type EachInKey<T> = keyof Exclude<T, null | undefined> & string;
