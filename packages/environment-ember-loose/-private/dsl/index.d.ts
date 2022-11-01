export * from './without-function-resolution';

import { ResolveOrReturn } from '@glint/template/-private/dsl';
import {
  DirectInvokable,
  EmptyObject,
  InvokableInstance,
  Invoke,
  InvokeDirect,
} from '@glint/template/-private/integration';

type OptNamed<N extends Record<string, unknown> | undefined> = N extends undefined
  ? NonNullable<N> | EmptyObject
  : N;

// Items that can be directly invoked by value
export declare function resolve<T extends DirectInvokable>(item: T): T[typeof InvokeDirect];
// Items whose instance type can be invoked
export declare function resolve<Args extends unknown[], Instance extends InvokableInstance>(
  item: (abstract new (...args: Args) => Instance) | null | undefined
): (...args: Parameters<Instance[typeof Invoke]>) => ReturnType<Instance[typeof Invoke]>;
// Functions that narrow the type of their first arg
export declare function resolve<Value, Args extends unknown[], T extends Value>(
  item: (value: Value, ...args: Args) => value is T
): (named: EmptyObject, value: Value, ...args: Args) => value is T;
// Functions that have a final parameter that looks like named args
export declare function resolve<
  P extends unknown[],
  N extends Record<string, unknown> | undefined,
  T
>(item: (...args: [...positional: P, named: N]) => T): (named: OptNamed<N>, ...positional: P) => T;
// All other functions
export declare function resolve<P extends unknown[], T>(
  item: (...positional: P) => T
): (named: EmptyObject, ...positional: P) => T;

export declare const resolveOrReturn: ResolveOrReturn<typeof resolve>;
