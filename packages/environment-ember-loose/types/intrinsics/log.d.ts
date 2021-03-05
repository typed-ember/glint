import { NoNamedArgs } from '@glint/template/-private';
import { Invokable } from '@glint/template/-private/resolution';

export type LogKeyword = Invokable<{
  (args: NoNamedArgs, ...params: unknown[]): void;
}>;
