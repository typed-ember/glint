import { AcceptsBlocks, DirectInvokable, EmptyObject } from '@glint/template/-private/integration';

export type EachInKeyword = DirectInvokable<{
  <T>(args: EmptyObject, object: T): AcceptsBlocks<{
    default: [key: keyof T, value: T[keyof T]];
  }>;
}>;
