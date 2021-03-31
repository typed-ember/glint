import { DirectInvokable, EmptyObject } from '@glint/template/-private/integration';
import ObjectProxy from '@ember/object/proxy';

export type GetHelper = DirectInvokable<{
  <T, K extends keyof T>(args: EmptyObject, obj: T, key: K): T[K];
  <T extends object, K extends keyof T>(args: EmptyObject, obj: ObjectProxy<T>, key: K): T[K];
  (args: EmptyObject, obj: unknown, key: string): unknown;
}>;
