import { DirectInvokable, EmptyObject } from '@glint/template/-private/integration';

export type LogHelper = DirectInvokable<{
  (args: EmptyObject, ...params: unknown[]): void;
}>;
