import { DirectInvokable } from '@glint/template/-private/integration';

export type ActionNamedArgs<T> = {
  value?: keyof T;
};

export type ActionResult<T, Args extends ActionNamedArgs<T>> = undefined extends Args['value']
  ? T
  : Args['value'] extends keyof T
  ? T[Args['value']]
  : T;

export type ActionKeyword = DirectInvokable<{
  <Ret, Args extends ActionNamedArgs<Ret>, Params extends unknown[]>(
    args: Args,
    f: (...rest: Params) => Ret
  ): (...rest: Params) => ActionResult<Ret, Args>;
  <A, Ret, Args extends ActionNamedArgs<Ret>, Params extends unknown[]>(
    args: Args,
    f: (a: A, ...rest: Params) => Ret,
    a: A
  ): (...rest: Params) => ActionResult<Ret, Args>;
  <A, B, Ret, Args extends ActionNamedArgs<Ret>, Params extends unknown[]>(
    args: Args,
    f: (a: A, b: B, ...rest: Params) => Ret,
    a: A,
    b: B
  ): (...rest: Params) => ActionResult<Ret, Args>;
  <A, B, C, Ret, Args extends ActionNamedArgs<Ret>, Params extends unknown[]>(
    args: Args,
    f: (a: A, b: B, c: C, ...rest: Params) => Ret,
    a: A,
    b: B,
    c: C
  ): (...rest: Params) => ActionResult<Ret, Args>;
  <A, B, C, D, Ret, Args extends ActionNamedArgs<Ret>, Params extends unknown[]>(
    args: Args,
    f: (a: A, b: B, c: C, d: D, ...rest: Params) => Ret,
    a: A,
    b: B,
    c: C,
    d: D
  ): (...rest: Params) => ActionResult<Ret, Args>;
  (args: ActionNamedArgs<Record<string, unknown>>, action: string, ...rest: unknown[]): (
    ...rest: unknown[]
  ) => unknown;
}>;
