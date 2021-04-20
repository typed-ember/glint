import { AcceptsBlocks, DirectInvokable, EmptyObject } from '@glint/template/-private/integration';

export type EachInKeyword = DirectInvokable<{
  <T>(args: EmptyObject, object: T): AcceptsBlocks<{
    default: [key: keyof NonNullable<T>, value: NonNullable<T>[keyof NonNullable<T>]];
    else?: [];
  }>;
}>;
