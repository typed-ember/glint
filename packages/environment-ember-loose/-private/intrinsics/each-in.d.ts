import { AcceptsBlocks, DirectInvokable, EmptyObject } from '@glint/template/-private/integration';

export type EachInKeyword = DirectInvokable<{
  <T>(args: EmptyObject, object: T): AcceptsBlocks<{
    default: [key: EachInKey<T>, value: NonNullable<T>[EachInKey<T>]];
    else?: [];
  }>;
}>;

// `{{each-in}}` internally uses `Object.keys`, so only string keys are included
// TS, on the other hand, gives a wider result for `keyof` than many users expect
// for record types: https://github.com/microsoft/TypeScript/issues/29249
type EachInKey<T> = keyof NonNullable<T> & string;
