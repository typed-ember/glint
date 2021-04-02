import { DirectInvokable, EmptyObject } from '@glint/template/-private/integration';
import ObjectProxy from '@ember/object/proxy';

export type GetHelper = DirectInvokable<{
  <T, K extends keyof T>(args: EmptyObject, obj: T, key: K): T[K];
  <T extends object, K extends keyof T>(
    args: EmptyObject,
    obj: ObjectProxy<T> | null | undefined,
    key: K
  ): T[K] | undefined;
  (args: EmptyObject, obj: null | undefined, key: string): undefined;
  (args: EmptyObject, obj: unknown, key: string): unknown;
}>;
