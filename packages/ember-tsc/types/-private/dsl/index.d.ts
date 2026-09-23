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

import { Mut } from '../intrinsics/mut';

/*
 * Computes the type of `{{fn ...}}` when it's curried into a component,
 * helper or modifier via the `{{component}}`/`{{helper}}`/`{{modifier}}`
 * keywords (#1147). Those keywords emit a two-stage comma expression (#1068),
 * and `fn` appearing in the result half is emitted as this call instead of a
 * real `fn` call:
 *
 *     {{component Foo onChange=(fn f a)}}
 *
 * becomes
 *
 *     (resolve(component)(Foo, { onChange: resolve(fn)(f, a) }),
 *      bindInvokable(Foo, { onChange: bindPositional(f, a) }))
 *
 * The keyword call validates the `fn` arguments with the component's arg
 * types as context, while `bindPositional` — being non-overloaded and not
 * itself returning a function type — isn't skipped by TypeScript's first
 * inference pass over `bindInvokable`'s arguments (`SkipGenericFunctions`).
 * A real `fn` call there made TypeScript give up on ALL of `bindInvokable`'s
 * type parameters, collapsing the result to
 * `Invokable<(...args: unknown[]) => unknown>`.
 *
 * Everywhere else `fn` is emitted as a real call, so it keeps its slot's
 * contextual type (#1247).
 *
 * Because argument validation is the keyword call's job, this signature is
 * deliberately lenient: a mismatched bind yields `never` here and a real,
 * mapped error from the keyword call. `Bound` is `const` so literal bound
 * arguments (`fn f "name"`) aren't widened before being matched against `f`'s
 * parameters. A generic `f` is instantiated rather than kept generic
 * (`fn identity "hi"` types as `() => unknown`, not `() => string`), and one
 * whose type parameters depend on each other may yield `never`; either way
 * only the curried arg's key matters to `bindInvokable`.
 */
export declare function bindPositional<F, const Bound extends unknown[]>(
  f: F,
  ...bound: Bound
): F extends Mut<infer T>
  ? Bound extends []
    ? (value: T) => void
    : () => void
  : F extends (...args: [...Bound, ...infer Rest]) => infer Ret
    ? (...rest: Rest) => Ret
    : never;

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
