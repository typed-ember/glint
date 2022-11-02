import {
  ComponentReturn,
  AnyFunction,
  ModifierReturn,
  FlattenBlockParams,
  Invokable,
  MaybeNamed,
  Constrain,
  GuardEmpty,
  Get,
  NamedArgNames,
  UnwrapNamedArgs,
  NamedArgs,
} from './integration';
import { ExpandSignature } from '@glimmer/component/-private/component';

/**
 * Any value that can be safely emitted into the DOM as top-level content,
 * i.e. as `<div>{{value}}</div>`.
 *
 * This includes primitives like strings, numbers and booleans; "nothing"
 * values like `null` and `undefined`; DOM nodes; and blockless curly
 * component invocations.
 */
export type ContentValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | void
  | SafeString
  | Node
  | ArglessCurlyComponent;

/**
 * Any value that can be safely set as an HTML attribute on a DOM node.
 * This includes strings, numbers, booleans and `null`/`undefined`.
 *
 * Note that this does not include functions, as writing something like
 * `onclick={{this.handleClick}}` in a template ultimately relies on
 * fallback behavior in the VM to set the `onclick` property, and is
 * better performed using the `{{on}}` modifier.
 */
export type AttrValue = string | number | boolean | null | undefined | SafeString;

/**
 * A value that is invokable like a component in a template. In an
 * appropriate Glint environment, subclasses of `EmberComponent` and
 * `GlimmerComponent` are examples of `ComponentLike` values, as are
 * the values returned from the `{{component}}` helper.
 *
 * The `S` signature parameter here is of the same form as the one
 * accepted by both the Ember and Glimmer `Component` base classes.
 */
export type ComponentLike<S = unknown> = Invokable<
  (
    ...args: [
      ...positional: ExpandSignature<S>['Args']['Positional'],
      ...named: MaybeNamed<NamedArgs<ExpandSignature<S>['Args']['Named']>>
    ]
  ) => ComponentReturn<
    FlattenBlockParams<ExpandSignature<S>['Blocks']>,
    ExpandSignature<S>['Element']
  >
>;

/**
 * A value that is invokable like a helper in a template. Notably,
 * subclasses of `Helper` and the return value of `helper()` from
 * `@ember/component/helper` are both `HelperLike` in an appropriate
 * Glint environment.
 *
 * The `S` signature parameter here is of the same form as the one
 * accepted by `Helper` and `helper`.
 */
export type HelperLike<S = unknown> = Invokable<
  (...args: InvokableArgs<S>) => Get<S, 'Return', unknown>
>;

/**
 * A value that is invokable like a modifier in a template. Notably,
 * subclasses of `Modifier` and the return value of `modifier()` from
 * `ember-modifier` are both `ModifierLike` in an appropriate Glint
 * environment.
 *
 * The `S` signature parameter here is of the same form as the ones
 * accepted by `Modifier` and `modifier`.
 */
export type ModifierLike<S = unknown> = Invokable<
  (element: Get<S, 'Element'>, ...args: InvokableArgs<S>) => ModifierReturn
>;

/**
 * Given a `ComponentLike`, `HelperLike` or `ModifierLike` value
 * along with a union representing named args that have been
 * pre-bound, this helper returns the same item back, but with those
 * named arguments made optional.
 *
 * This is typically useful in conjunction with something like the
 * `{{component}}` helper; for instance, if you wrote this in a
 * template:
 *
 * ```handlebars
 * {{yield (component MyComponent message="Hello")}}
 * ```
 *
 * Consumers of that yielded value would be able to invoke the
 * component without having to provide a value for `@message`
 * themselves. You could represent this in your signature as:
 *
 * ```ts
 * Blocks: {
 *   default: [WithBoundArgs<typeof MyComponent, 'message'>];
 * };
 * ```
 *
 * If you had instead just written `default: [typeof MyComponent]`,
 * consumers would still be obligated to provide a `@message`
 * arg when invoking the yielded component.
 */
export type WithBoundArgs<
  T extends Invokable<AnyFunction>,
  BoundArgs extends NamedArgNames<T>
> = T extends Invokable<(...args: [...positional: infer P, named: infer N]) => infer R>
  ? Invokable<
      (
        ...args: [
          ...positional: P,
          ...named: MaybeNamed<PrebindArgs<UnwrapNamedArgs<NonNullable<N>>, BoundArgs>>
        ]
      ) => R
    >
  : never;

// We use the imported `ExpandSignature` for component signatures, as they have
// different layers of possible shorthand, but modifiers and helpers only have
// one structure they can specify their args in, so this utility is sufficient.
export type InvokableArgs<S> = [
  ...positional: Constrain<Get<Get<S, 'Args'>, 'Positional'>, Array<unknown>, []>,
  ...named: MaybeNamed<NamedArgs<GuardEmpty<Get<Get<S, 'Args'>, 'Named'>>>>
];

type PrebindArgs<T, Args extends keyof UnwrapNamedArgs<T>> = NamedArgs<
  Omit<UnwrapNamedArgs<T>, Args> & Partial<Pick<UnwrapNamedArgs<T>, Args>>
>;

// This encompasses both @glimmer/runtime and @ember/template's notion of `SafeString`s,
// and this coverage is tested in `emit-content.test.ts`.
type SafeString = { toHTML(): string };

// `{{foo}}` becomes `emitContent(resolveOrReturn(foo)({})`, which means if `foo`
// is a component that accepts no args, then this is a valid invocation.
type ArglessCurlyComponent = ComponentReturn<{}, any>;

export {};
