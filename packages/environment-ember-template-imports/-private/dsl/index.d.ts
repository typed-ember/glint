// transformed .gts files will import this file directly. Therefore we can take this opportunity
// to import the main index file with all of the `/// <reference path="..." />`s to include the
// declarations mergings for upstream packages like `@ember/component` and `@glimmer/component`.
// With this, users should no long need to put a `import '@glint/environment-ember-template-imports'`
// "somewhere" in their projects.
import '../index';

export * from '@glint/template/-private/dsl';
export { Globals } from './globals';

import { ResolveOrReturn } from '@glint/template/-private/dsl';
import {
  ComponentReturn,
  AnyContext,
  AnyFunction,
  DirectInvokable,
  HasContext,
  InvokableInstance,
  Invoke,
  InvokeDirect,
  TemplateContext,
} from '@glint/template/-private/integration';

// Items that can be directly invoked by value
export declare function resolve<T extends DirectInvokable>(item: T): T[typeof InvokeDirect];
// Items whose instance type can be invoked
export declare function resolve<Args extends unknown[], Instance extends InvokableInstance>(
  item: (abstract new (...args: Args) => Instance) | null | undefined,
): (...args: Parameters<Instance[typeof Invoke]>) => ReturnType<Instance[typeof Invoke]>;
// Plain functions
export declare function resolve<T extends ((...params: any) => any) | null | undefined>(
  item: T,
): NonNullable<T>;

export declare const resolveOrReturn: ResolveOrReturn<typeof resolve>;

// We customize the top-level `templateExpression` wrapper function for this environment to
// return a type that's assignable to `TemplateOnlyComponent` from '@ember/component/template-only'.
// Longer term we should rationalize this to a type that doesn't carry extra baggage
// and likely comes from a more sensible path.

import { TemplateOnlyComponent } from '@ember/component/template-only';

export declare function templateExpression<
  Signature extends AnyFunction = () => ComponentReturn<{}>,
  Context extends AnyContext = TemplateContext<void, {}, {}, void>,
>(
  f: (__glintRef__: Context, __glintDSL__: never) => void,
): TemplateOnlyComponent<never> &
  (abstract new () => InvokableInstance<Signature> & HasContext<Context>);
