// Adapted from `ember-truth-helpers` to give Glint exact return-type inference
// for the `(and ...)` and `(or ...)` built-in keywords introduced in
// ember-source 7.1 (RFC 560). The runtime semantics in Ember intentionally
// match `ember-truth-helpers`, so the type-level rules here mirror that
// package's published types.
//
// See: https://github.com/jmurphyau/ember-truth-helpers/blob/master/src/utils/truth-convert.ts

export type Falsy = { isTruthy: false } | undefined | null | false | 0 | 0n | '' | never[];

export type MaybeTruthy =
  | { isTruthy: boolean }
  | undefined
  | null
  | boolean
  | number
  | bigint
  | string
  | unknown[]
  | object;

export type TruthConvert<T> = T extends { isTruthy: true }
  ? true
  : T extends { isTruthy: false }
    ? false
    : T extends { isTruthy: boolean }
      ? boolean
      : T extends undefined | null
        ? false
        : T extends boolean
          ? T
          : T extends number
            ? T extends 0
              ? false
              : number extends T
                ? boolean
                : true
            : T extends bigint
              ? T extends 0n
                ? false
                : bigint extends T
                  ? boolean
                  : true
              : T extends string
                ? T extends ''
                  ? false
                  : string extends T
                    ? boolean
                    : true
                : T extends never[]
                  ? false
                  : T extends ArrayLike<unknown>
                    ? boolean
                    : T extends object
                      ? true
                      : boolean;

/**
 * Walks the positional argument tuple and returns the type of the first
 * element whose `TruthConvert` resolves to `false`, falling back to the last
 * element. Mirrors the runtime short-circuit behaviour of `(and ...)`.
 */
export type FirstFalsy<T> = T extends [infer Item]
  ? Item
  : T extends [infer Head, ...infer Tail]
    ? TruthConvert<Head> extends false
      ? Head
      : TruthConvert<Head> extends true
        ? FirstFalsy<Tail>
        : Head | FirstFalsy<Tail>
    : undefined;

/**
 * Walks the positional argument tuple and returns the type of the first
 * element whose `TruthConvert` resolves to `true`, falling back to the last
 * element. Mirrors the runtime short-circuit behaviour of `(or ...)`.
 */
export type FirstTruthy<T> = T extends [infer Item]
  ? Item
  : T extends [infer Head, ...infer Tail]
    ? TruthConvert<Head> extends true
      ? Head
      : TruthConvert<Head> extends false
        ? FirstTruthy<Tail>
        : Exclude<Head, Falsy> | FirstTruthy<Tail>
    : undefined;
