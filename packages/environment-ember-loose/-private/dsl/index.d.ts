import './integration-declarations';

import { ResolveOrReturn } from '@glint/template/-private/dsl';
import {
  DirectInvokable,
  Invokable,
  InvokableInstance,
  Invoke,
  InvokeDirect,
} from '@glint/template/-private/integration';
import { Globals } from './globals';

export * from '@glint/template/-private/dsl';
export { Globals };

// Items that can be directly invoked by value
export declare function resolve<T extends DirectInvokable>(item: T): T[typeof InvokeDirect];
// Items whose instance type can be invoked
export declare function resolve<Args extends unknown[], Instance extends InvokableInstance>(
  item: (abstract new (...args: Args) => Instance) | null | undefined
): (...args: Parameters<Instance[typeof Invoke]>) => ReturnType<Instance[typeof Invoke]>;
// Plain functions
export declare function resolve<T extends ((...params: any) => any) | null | undefined>(
  item: T
): NonNullable<T>;

export declare const resolveOrReturn: ResolveOrReturn<typeof resolve>;

// In loose mode, binding helpers accept not just actual invokables but also simply their string names.
export declare function resolveForBind<T extends DirectInvokable>(item: T): T[typeof InvokeDirect];
// Items whose instance type can be invoked
export declare function resolveForBind<Args extends unknown[], Instance extends InvokableInstance>(
  item: abstract new (...args: Args) => Instance
): (...args: Parameters<Instance[typeof Invoke]>) => ReturnType<Instance[typeof Invoke]>;
export declare function resolveForBind<Args extends unknown[], Instance extends InvokableInstance>(
  item: (abstract new (...args: Args) => Instance) | null | undefined
): ((...args: Parameters<Instance[typeof Invoke]>) => ReturnType<Instance[typeof Invoke]>) | null;
// Plain functions
export declare function resolveForBind<T extends ((...params: any) => any) | null | undefined>(
  item: T
): T;
export declare function resolveForBind<T extends ((...params: any) => any) | null | undefined>(
  item: T | null | undefined
): NonNullable<T> | null;
// String lookups
export declare function resolveForBind<T extends keyof Globals>(
  item: T
): Globals[T] extends Invokable<infer F>
  ? F
  : Globals[T] extends DirectInvokable<infer F>
  ? F
  : Globals[T];
export declare function resolveForBind<T extends keyof Globals>(
  item: T | null | undefined
):
  | (Globals[T] extends Invokable<infer F>
      ? F
      : Globals[T] extends DirectInvokable<infer F>
      ? F
      : Globals[T])
  | null;
