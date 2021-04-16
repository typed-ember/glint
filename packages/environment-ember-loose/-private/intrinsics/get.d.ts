import { DirectInvokable, EmptyObject } from '@glint/template/-private/integration';
import ObjectProxy from '@ember/object/proxy';
import { UnwrapComputedPropertyGetter } from '@ember/object/-private/types';

export type GetHelper = DirectInvokable<{
  <T, K extends keyof T>(args: EmptyObject, obj: T, key: K): UnwrapComputedPropertyGetter<T[K]>;
  <T, K extends keyof T>(args: EmptyObject, obj: T | null | undefined, key: K):
    | UnwrapComputedPropertyGetter<T[K]>
    | undefined;
  <T extends object, K extends keyof T>(
    args: EmptyObject,
    obj: ObjectProxy<T> | null | undefined,
    key: K
  ): UnwrapComputedPropertyGetter<T[K]> | undefined;
  (args: EmptyObject, obj: null | undefined, key: string): undefined;
  (args: EmptyObject, obj: unknown, key: string): unknown;
}>;
