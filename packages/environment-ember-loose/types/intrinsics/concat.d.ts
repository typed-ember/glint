import { NoNamedArgs } from '@glint/template/-private';
import { DirectInvokable } from '@glint/template/-private/resolution';

export type ConcatHelper = DirectInvokable<{
  (args: NoNamedArgs, ...params: unknown[]): string;
}>;
