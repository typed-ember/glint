import {
  AcceptsBlocks,
  AnyFunction,
  BoundModifier,
  EmptyObject,
  FlattenBlockParams,
  Invokable,
} from './integration';
import { ExpandSignature } from '@glimmer/component/-private/component';

/**
 * A value that is invokable like a component in a template. In an
 * appropriate Glint environment, subclasses of `EmberComponent` and
 * `GlimmerComponent` are examples of `ComponentLike` values, as are
 * the values returned from the `{{component}}` helper.
 *
 * The `S` signature paramter here is of the same form as the one
 * accepted by both the Ember and Glimmer `Component` base classes.
 */
export type ComponentLike<S = unknown> = InvokableConstructor<
  (
    named: ExpandSignature<S>['Args']['Named'],
    ...positional: ExpandSignature<S>['Args']['Positional']
  ) => AcceptsBlocks<
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
export type HelperLike<S = unknown> = InvokableConstructor<
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
export type ModifierLike<S = unknown> = InvokableConstructor<
  (...args: InvokableArgs<S>) => BoundModifier<Constrain<Get<S, 'Element'>, Element>>
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
  T extends InvokableConstructor<AnyFunction>,
  BoundArgs extends NamedArgNames<T>
> = T extends InvokableConstructor<
  (named: infer Named, ...positional: infer Positional) => infer Result
>
  ? InvokableConstructor<
      (
        named: Omit<Named, BoundArgs> & Partial<Pick<Named, BoundArgs & keyof Named>>,
        ...positional: Positional
      ) => Result
    >
  : never;

type InvokableConstructor<F extends AnyFunction> = abstract new (...args: any) => Invokable<F>;
type NamedArgNames<T extends InvokableConstructor<AnyFunction>> = T extends InvokableConstructor<
  (named: infer Named, ...positional: any) => any
>
  ? keyof Named
  : never;

type Get<T, K, Otherwise = unknown> = K extends keyof T ? T[K] : Otherwise;
type Constrain<T, Constraint, Otherwise = Constraint> = T extends Constraint ? T : Otherwise;

// We use the imported `ExpandSignature` for component signatures, as they have
// different layers of possible shorthand, but modifiers and helpers only have
// one structure they can specify their args in, so this utility is sufficient.
type InvokableArgs<S> = [
  named: Get<Get<S, 'Args'>, 'Named', EmptyObject>,
  ...positional: Constrain<Get<Get<S, 'Args'>, 'Positional'>, Array<unknown>, []>
];
