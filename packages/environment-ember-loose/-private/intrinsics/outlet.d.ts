import { DirectInvokable, EmptyObject } from '@glint/template/-private/integration';

export type OutletKeyword = DirectInvokable<{
  (args: EmptyObject, name?: string): void;
}>;
