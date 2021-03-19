import { DirectInvokable, EmptyObject } from '@glint/template/-private/integration';

export type ConcatHelper = DirectInvokable<{
  (args: EmptyObject, ...params: unknown[]): string;
}>;
