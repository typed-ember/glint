import { AcceptsBlocks, NoNamedArgs } from '@glint/template/-private';
import { DirectInvokable } from '@glint/template/-private/resolution';

export type EachInKeyword = DirectInvokable<{
  <T>(args: NoNamedArgs, object: T): AcceptsBlocks<{
    default: [key: keyof T, value: T[keyof T]];
  }>;
}>;
