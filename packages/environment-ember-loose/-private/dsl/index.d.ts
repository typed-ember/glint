export * from './without-function-resolution';

// Exported for `environment-ember-template-imports` to reuse
export type { ComponentKeyword } from '../intrinsics/component';

import { ResolveOrReturn } from '@glint/template/-private/dsl';
import {
  DirectInvokable,
  InvokableInstance,
  Invoke,
  InvokeDirect,
} from '@glint/template/-private/integration';

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
