export * from '@glint/template';
export { Globals } from './globals';

/*
 * Since GlimmerX supports using bare functions as helpers that only
 * accept positional parameters, we can't just use the core definitions
 * of `resolve` and `resolveOrReturn`. Instead we need to export versions
 * with additional overloads at the correct point in the chain to handle
 * those functions correctly.
 *
 * In order, we have:
 *  - explicit `DirectInvokable<T>`
 *  - constructor for an `Invokable<T>`
 *  - a plain type guard
 *  - any other kind of plain function
 *
 * And in the case of `resolveOrReturn`, a final fallback for any other
 * type of value. See the upstream definitions in `@glint/template` for
 * further details on resolution.
 */

import {
  DirectInvokable,
  Invokable,
  Invoke,
  InvokeDirect,
} from '@glint/template/-private/resolution';
import { CreatesModifier, NoNamedArgs } from '@glint/template/-private/signature';

export declare function resolve<T extends DirectInvokable>(item: T): T[typeof InvokeDirect];
export declare function resolve<Args extends unknown[], Instance extends Invokable>(
  item: new (...args: Args) => Instance
): (...args: Parameters<Instance[typeof Invoke]>) => ReturnType<Instance[typeof Invoke]>;
export declare function resolve<Value, Args extends unknown[], T extends Value>(
  item: (value: Value, ...args: Args) => value is T
): (named: NoNamedArgs, value: Value, ...args: Args) => value is T;
export declare function resolve<El extends Element, Args extends unknown[]>(
  item: (element: El, ...args: Args) => void | (() => void)
): (named: NoNamedArgs, ...args: Args) => CreatesModifier<El>;
export declare function resolve<Args extends unknown[], T>(
  item: (...args: Args) => T
): (named: NoNamedArgs, ...args: Args) => T;

export declare function resolveOrReturn<T extends DirectInvokable>(item: T): T[typeof InvokeDirect];
export declare function resolveOrReturn<Args extends unknown[], Instance extends Invokable>(
  item: new (...args: Args) => Instance
): (...args: Parameters<Instance[typeof Invoke]>) => ReturnType<Instance[typeof Invoke]>;
export declare function resolveOrReturn<Value, Args extends unknown[], T extends Value>(
  item: (value: Value, ...args: Args) => value is T
): (named: NoNamedArgs, value: Value, ...args: Args) => value is T;
export declare function resolveOrReturn<Args extends unknown[], T>(
  item: (...args: Args) => T
): (named: NoNamedArgs, ...args: Args) => T;
export declare function resolveOrReturn<T>(item: T): (args: NoNamedArgs) => T;
