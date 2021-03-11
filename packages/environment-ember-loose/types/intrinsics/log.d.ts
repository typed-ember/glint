import { NoNamedArgs } from '@glint/template/-private';
import { DirectInvokable } from '@glint/template/-private/resolution';

export type LogKeyword = DirectInvokable<{
  (args: NoNamedArgs, ...params: unknown[]): void;
}>;
