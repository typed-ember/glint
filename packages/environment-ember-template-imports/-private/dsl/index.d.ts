export * from '@glint/template/-private/dsl';
export { Globals } from './globals';

import './integration-declarations';

import { ResolveOrReturn } from '@glint/template/-private/dsl';
import {
  AcceptsBlocks,
  AnyContext,
  AnyFunction,
  BoundModifier,
  DirectInvokable,
  EmptyObject,
  HasContext,
  Invokable,
  Invoke,
  InvokeDirect,
  TemplateContext,
} from '@glint/template/-private/integration';

type OptNamed<N extends Record<string, unknown> | undefined> = N extends undefined
  ? NonNullable<N> | EmptyObject
  : N;

/*
 * Even though `ember-template-imports` itself doesn't include default helper and
 * modifier managers, they're accepted and pending RFCs respectively, and users
 * polyfilling or hand-rolling those features are highly correlated with ETI use.
 *
 * These `resolve` signatures were worked out by @chriskrycho as part of vetting
 * the default helper manager RFC for compatibility with Glint.
 */

export declare function resolve<T extends DirectInvokable>(item: T): T[typeof InvokeDirect];
export declare function resolve<Args extends unknown[], Instance extends Invokable>(
  item: (abstract new (...args: Args) => Instance) | null | undefined
): (...args: Parameters<Instance[typeof Invoke]>) => ReturnType<Instance[typeof Invoke]>;

// Make functions which type-narrow work.
export declare function resolve<Value, Args extends unknown[], T extends Value>(
  item: (value: Value, ...args: Args) => value is T
): (named: EmptyObject, value: Value, ...args: Args) => value is T;

// no-arg functions are helpers
export declare function resolve<T>(item: () => T): (named: EmptyObject) => T;

// non-modifier functions with an `unknown` first arg, so a helper
export declare function resolve<
  P extends unknown[],
  N extends Record<string, unknown> | undefined,
  T
>(
  item: (arg: unknown, ...args: [...positional: P, named: N]) => T
): (named: OptNamed<N>, arg: unknown, ...positional: P) => T;
export declare function resolve<P extends unknown[], T>(
  item: (arg: unknown, ...positional: P) => T
): (named: EmptyObject, arg: unknown, ...positional: P) => T;

// modifiers as functions
export declare function resolve<
  El extends Element,
  P extends unknown[],
  N extends Record<string, unknown> | undefined
>(
  item: (element: El, ...args: [...positional: P, named: N]) => void | (() => void)
): (named: OptNamed<N>, ...positional: P) => BoundModifier<El>;
export declare function resolve<El extends Element, P extends unknown[]>(
  item: (element: El, ...positional: P) => void | (() => void)
): (named: EmptyObject, ...positional: P) => BoundModifier<El>;

// other functions-as-helpers
export declare function resolve<
  P extends unknown[],
  N extends Record<string, unknown> | undefined,
  T
>(item: (...args: [...positional: P, named: N]) => T): (named: OptNamed<N>, ...positional: P) => T;
export declare function resolve<P extends unknown[], T>(
  item: (...positional: P) => T
): (named: EmptyObject, ...positional: P) => T;

export declare const resolveOrReturn: ResolveOrReturn<typeof resolve>;

// We customize the top-level `templateExpression` wrapper function for this environment to
// return a type that's assignable to `TemplateOnlyComponent` from '@ember/component/template-only'.
// Longer term we should rationalize this to a type that doesn't carry extra baggage
// and likely comes from a more sensible path.

import { TemplateOnlyComponent } from '@ember/component/template-only';

export declare function templateExpression<
  Signature extends AnyFunction = (args: EmptyObject) => AcceptsBlocks<EmptyObject>,
  Context extends AnyContext = TemplateContext<void, EmptyObject, EmptyObject, void>
>(
  f: (𝚪: Context, χ: never) => void
): TemplateOnlyComponent<never> & (new () => Invokable<Signature> & HasContext<Context>);

export declare function noop(value: unknown): void;
