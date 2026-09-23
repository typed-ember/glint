// Reference the scaffolding for our merged declarations for third party modules so
// that vanilla TS will see those as long as authors have
// `import '@glint/ember-tsc/environment-ember-template-imports'` somewhere in their project.

/// <reference path="../../globals/index.d.ts" preserve="true" />
/// <reference path="./integration-declarations.d.ts" preserve="true" />

export * from '@glint/template/-private/dsl';
export { Globals } from './globals';

import { ResolveOrReturn } from '@glint/template/-private/dsl';
import {
  AnyContext,
  AnyFunction,
  ComponentReturn,
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

/*
 * The value emitted for each named arg of a `bindInvokable(...)` call.
 * `{{component}}`, `{{helper}}` and `{{modifier}}` emit that call
 * as the second half of a comma pair (#1068):
 *
 *     {{component Foo onChange=(fn f a)}}
 *
 * becomes
 *
 *     (resolve(component)(Foo, { onChange: resolve(fn)(f, a) }),
 *      bindInvokable(Foo, { onChange: boundArg }))
 *
 * `bindInvokable` only reads the keys of its named args.
 * The keyword call validates the values,
 * with the invokable's arg types as context.
 *
 * Emitting the real values there could collapse `bindInvokable`'s inference
 * to `Invokable<(...args: unknown[]) => unknown>`.
 * During an outer call's first inference pass (`SkipGenericFunctions`),
 * TypeScript skips calls to generic functions that return functions,
 * such as `fn` and ember-set-helper's `set`.
 * `bindInvokable`'s type parameters are lost with them (#1147).
 */
export declare const boundArg: unknown;

import { Invokable } from '@glint/template/-private/integration';

/*
 * The cast target for a `{{#let}}`-bound curried component consumed in
 * argument position (#1068).
 *
 * When `{{component Cell onSelect=@onSelect}}` curries a generic class
 * component, `bindInvokable` deliberately keeps the component's own type
 * parameter free — that's what lets the curried value satisfy generic-shaped
 * targets like `WithBoundArgs<typeof Cell, 'onSelect'>` (typically reached
 * via `{{yield}}`). But when such a value is passed as an ARG to another
 * generic component, TypeScript has no way to unify the curried value's
 * independent type parameter with the consumer's: inference instantiates it
 * to its constraint, and that collapsed candidate wins over (or conflicts
 * with) the correct inference from sibling args. No library-signature shape
 * can express "pin the curried generic from the bound args" — signature
 * instantiation in context only fires when the target signature is otherwise
 * fully concrete — so instead the transform casts the reference to this
 * inference-inert type at exactly those use sites. The value contributes no
 * inference candidates (so the consumer's type parameter is inferred from its
 * other args), while remaining an `Invokable`, so passing it where no
 * invokable belongs is still an error. The trade-off: compatibility between
 * the curried component's signature and the consuming arg's declared type is
 * not checked at that position.
 */
export type InferenceInertInvokable = Invokable<(...args: any[]) => any>;
