import { DirectInvokable } from '@glint/template/-private/integration';
import ObjectProxy from '@ember/object/proxy';

// This hack lets us support both the stable/preview types from `ember-source`
// and the classic types still live on DefinitelyTyped. If using the DT types,
// the `declare module` below acts as a declaration merge for a module which is
// then integrated via the rest of the DT types. If using the stable/preview
// types, the module does not exist and this ends up being a no-op.
//
// Note: we intentionally do *not* add a side-effect `import '@ember/object/-private/types'`
// here. TypeScript 6.0 errors (TS2882) on a side-effect import of a module that
// cannot be resolved, which is exactly the no-op (ember-source) case above. The
// `declare module` augmentation still merges into the DT module when it exists.
declare const GetSetMarker: unique symbol;
declare module '@ember/object/-private/types' {
  interface ComputedPropertyMarker<Get, Set = Get> {
    [GetSetMarker]: [Get, Set];
  }
}

type UnwrapComputedPropertyGetter<T> = T extends { [GetSetMarker]: [infer U, any] } ? U : T;

export type GetHelper = DirectInvokable<{
  <T, K extends keyof T>(obj: T, key: K): UnwrapComputedPropertyGetter<T[K]>;
  <T, K extends keyof T>(
    obj: T | null | undefined,
    key: K,
  ): UnwrapComputedPropertyGetter<T[K]> | undefined;
  <T extends object, K extends keyof T>(
    obj: ObjectProxy<T> | null | undefined,
    key: K,
  ): UnwrapComputedPropertyGetter<T[K]> | undefined;
  (obj: null | undefined, key: string): undefined;
  (obj: unknown, key: string): unknown;
}>;
