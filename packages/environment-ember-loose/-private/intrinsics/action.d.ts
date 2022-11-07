import { DirectInvokable, NamedArgs } from '@glint/template/-private/integration';

export type ActionNamedArgs<T> = NamedArgs<{
  value?: keyof T;
}>;

export type ActionResult<T, Args extends ActionNamedArgs<T>> = undefined extends Args['value']
  ? T
  : Args['value'] extends keyof T
  ? T[Args['value']]
  : T;

export type ActionKeyword = DirectInvokable<{
  <Ret, Args extends ActionNamedArgs<Ret>, Params extends unknown[]>(
    f: (...rest: Params) => Ret,
    args?: Args
  ): (...rest: Params) => ActionResult<Ret, Args>;
  <A, Ret, Args extends ActionNamedArgs<Ret>, Params extends unknown[]>(
    f: (a: A, ...rest: Params) => Ret,
    a: A,
    args?: Args
  ): (...rest: Params) => ActionResult<Ret, Args>;
  <A, B, Ret, Args extends ActionNamedArgs<Ret>, Params extends unknown[]>(
    f: (a: A, b: B, ...rest: Params) => Ret,
    a: A,
    b: B,
    args?: Args
  ): (...rest: Params) => ActionResult<Ret, Args>;
  <A, B, C, Ret, Args extends ActionNamedArgs<Ret>, Params extends unknown[]>(
    f: (a: A, b: B, c: C, ...rest: Params) => Ret,
    a: A,
    b: B,
    c: C,
    args?: Args
  ): (...rest: Params) => ActionResult<Ret, Args>;
  <A, B, C, D, Ret, Args extends ActionNamedArgs<Ret>, Params extends unknown[]>(
    f: (a: A, b: B, c: C, d: D, ...rest: Params) => Ret,
    a: A,
    b: B,
    c: C,
    d: D,
    args?: Args
  ): (...rest: Params) => ActionResult<Ret, Args>;
  (action: string, ...rest: unknown[]): (...rest: unknown[]) => unknown;
}>;
