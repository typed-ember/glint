import { DirectInvokable } from '@glint/template/-private/integration';
import ObjectProxy from '@ember/object/proxy';
import '@ember/object/-private/types';

// This hack lets us support both the stable/preview types from `ember-source`
// and the classic types still live on DefinitelyTyped. If using the DT types,
// this acts as a declaration merge for a module which is then integrated via
// the rest of the DT types. If using the stable/preview types, this ends up
// being a no-op.
declare const GetSetMarker: unique symbol;
declare module '@ember/object/-private/types' {
  interface ComputedPropertyMarker<Get, Set = Get> {
    [GetSetMarker]: [Get, Set];
  }
}

type UnwrapComputedPropertyGetter<T> = T extends { [GetSetMarker]: [infer U, any] } ? U : T;

export type GetHelper = DirectInvokable<{
  <T, K extends keyof T>(obj: T, key: K): UnwrapComputedPropertyGetter<T[K]>;
  <T, K extends keyof T>(obj: T | null | undefined, key: K):
    | UnwrapComputedPropertyGetter<T[K]>
    | undefined;
  <T extends object, K extends keyof T>(obj: ObjectProxy<T> | null | undefined, key: K):
    | UnwrapComputedPropertyGetter<T[K]>
    | undefined;
  (obj: null | undefined, key: string): undefined;
  (obj: unknown, key: string): unknown;
}>;
