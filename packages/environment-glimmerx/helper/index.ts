import * as glimmerxHelper from '@glimmerx/helper';

export * from '@glimmerx/helper';

import type { DirectInvokable, Invokable } from '@glint/template/-private/resolution';
import type { EmptyObject } from '@glint/template/-private/signature';

type HelperFactory = <Result, Named = EmptyObject, Positional extends unknown[] = []>(
  fn: (positional: Positional, named: Named) => Result
) => new () => Invokable<(args: Named, ...positional: Positional) => Result>;

type FnHelper = DirectInvokable<{
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
}>;

export const fn = (glimmerxHelper.fn as unknown) as FnHelper;
export const helper = (glimmerxHelper.helper as unknown) as HelperFactory;
