import { DirectInvokable, EmptyObject } from '@glint/template/-private/integration';
import { Mut } from './mut';

export type FnHelper = DirectInvokable<{
  <T>(args: EmptyObject, update: Mut<T>): (value: T) => void;
  <T>(args: EmptyObject, update: Mut<T>, value: T): () => void;
  <Ret, Args extends unknown[]>(args: EmptyObject, f: (...rest: Args) => Ret): (
    ...rest: Args
  ) => Ret;
  <A, Ret, Args extends unknown[]>(args: EmptyObject, f: (a: A, ...rest: Args) => Ret, a: A): (
    ...rest: Args
  ) => Ret;
  <A, B, Ret, Args extends unknown[]>(
    args: EmptyObject,
    f: (a: A, b: B, ...rest: Args) => Ret,
    a: A,
    b: B
  ): (...rest: Args) => Ret;
  <A, B, C, Ret, Args extends unknown[]>(
    args: EmptyObject,
    f: (a: A, b: B, c: C, ...rest: Args) => Ret,
    a: A,
    b: B,
    c: C
  ): (...rest: Args) => Ret;
  <A, B, C, D, Ret, Args extends unknown[]>(
    args: EmptyObject,
    f: (a: A, b: B, c: C, d: D, ...rest: Args) => Ret,
    a: A,
    b: B,
    c: C,
    d: D
  ): (...rest: Args) => Ret;
  <A, B, C, D, E, Ret, Args extends unknown[]>(
    args: EmptyObject,
    f: (a: A, b: B, c: C, d: D, e: E, ...rest: Args) => Ret,
    a: A,
    b: B,
    c: C,
    d: D,
    e: E
  ): (...rest: Args) => Ret;
  <A, B, C, D, E, G, Ret, Args extends unknown[]>(
    args: EmptyObject,
    f: (a: A, b: B, c: C, d: D, e: E, g: G, ...rest: Args) => Ret,
    a: A,
    b: B,
    c: C,
    d: D,
    e: E,
    g: G
  ): (...rest: Args) => Ret;
}>;
