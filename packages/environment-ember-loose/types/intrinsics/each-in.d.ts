import { AcceptsBlocks, NoNamedArgs } from '@glint/template/-private';

export interface EachInKeyword {
  <T>(args: NoNamedArgs, object: T): AcceptsBlocks<{
    default: [key: keyof T, value: T[keyof T]];
  }>;
}
