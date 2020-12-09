import { NoNamedArgs } from '@glint/template/-private';

export interface LogKeyword {
  (args: NoNamedArgs, ...params: unknown[]): void;
}
