import { DirectInvokable, EmptyObject } from '@glint/template/-private/integration';

export type GetHelper = DirectInvokable<{
  <T, K extends keyof T>(args: EmptyObject, obj: T, key: K): T[K];
  (args: EmptyObject, obj: unknown, key: string): unknown;
}>;
