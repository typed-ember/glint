import { AcceptsBlocks, NoNamedArgs } from '@glint/template/-private';
import { Invokable } from '@glint/template/-private/resolution';

export type EachInKeyword = Invokable<{
  <T>(args: NoNamedArgs, object: T): AcceptsBlocks<{
    default: [key: keyof T, value: T[keyof T]];
  }>;
}>;
