export * from '@glint/template/-private/dsl';
export { Globals } from './globals';

import './integration-declarations';

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

import { ResolveOrReturn } from '@glint/template/-private/dsl';
import {
  ComponentReturn,
  AnyContext,
  AnyFunction,
  DirectInvokable,
  EmptyObject,
  HasContext,
  InvokableInstance,
  Invoke,
  InvokeDirect,
  TemplateContext,
  ModifierReturn,
} from '@glint/template/-private/integration';

export declare function resolve<T extends DirectInvokable>(item: T): T[typeof InvokeDirect];
export declare function resolve<Args extends unknown[], Instance extends InvokableInstance>(
  item: abstract new (...args: Args) => Instance | null | undefined
): (...args: Parameters<Instance[typeof Invoke]>) => ReturnType<Instance[typeof Invoke]>;
export declare function resolve<T extends ((...params: any) => any) | null | undefined>(
  item: T
): NonNullable<T>;

export declare const resolveOrReturn: ResolveOrReturn<typeof resolve>;

// We customize the top-level `templateExpression` wrapper function for this environment to
// return a type that's assignable to `TemplateComponent` from '@glimmerx/component'.
// Longer term we should rationalize this to a type that doesn't carry extra baggage
// and likely comes from a more sensible path.

import { TemplateComponent } from '@glimmerx/component';

export declare function templateExpression<
  Signature extends AnyFunction = () => ComponentReturn<EmptyObject>,
  Context extends AnyContext = TemplateContext<void, EmptyObject, EmptyObject, void>
>(
  f: (𝚪: Context, χ: never) => void
): TemplateComponent<never> & (new () => InvokableInstance<Signature> & HasContext<Context>);

// We customize `applyModifier` to accept `void | () => void` as a valid modifier return type
export function applyModifier(modifierResult: ModifierReturn | void | (() => void)): void;
