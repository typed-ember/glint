import { DirectInvokable, EmptyObject } from '@glint/template/-private/integration';
import ObjectProxy from '@ember/object/proxy';

// Shenanigans to support both the `@types/ember__object` definition, which
// still has support for `UnwrapComputedPropertyGetter` etc., and the preview
// and stable types from Ember, which do not.
import '@ember/object/-private/types';

declare const GetSetMarker: unique symbol;
declare module '@ember/object/-private/types' {
  interface ComputedPropertyMarker<Get, Set = Get> {
    [GetSetMarker]: [Get, Set];
  }
}

type UnwrapComputedPropertyGetter<T> = T extends { [GetSetMarker]: [infer U, any] } ? U : T;

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
