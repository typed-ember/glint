import { WithBoundArgs } from '../index';
import {
  ComponentReturn,
  DirectInvokable,
  InvokableInstance,
  NamedArgs,
  Invokable,
  NamedArgNames,
  AnyFunction,
  UnwrapNamedArgs,
} from '../integration';

type PartiallyAppliedComponent<Component, Args> = Component extends Invokable<AnyFunction>
  ? WithBoundArgs<
      Component,
      Exclude<Args extends NamedArgNames<Component> ? Args : never, typeof NamedArgs>
    >
  : never;

export type ComponentKeyword = DirectInvokable<{
  <
    Named,
    Positional extends unknown[],
    Return extends ComponentReturn<any, any>,
    ConstructorArgs extends unknown[],
    GivenArgs extends Partial<Named> = {}
  >(
    component: abstract new (...args: ConstructorArgs) => InvokableInstance<
      (...args: [...positional: Positional, named: Named]) => Return
    >,
    args?: NamedArgs<GivenArgs>
  ): PartiallyAppliedComponent<
    abstract new (...args: ConstructorArgs) => InvokableInstance<
      (...args: [...positional: Positional, named: Named]) => Return
    >,
    keyof UnwrapNamedArgs<GivenArgs>
  >;
  <
    Named,
    Positional extends unknown[],
    Return extends ComponentReturn<any, any>,
    ConstructorArgs extends unknown[],
    GivenArgs extends Partial<Named> = {}
  >(
    component:
      | null
      | undefined
      | (abstract new (...args: ConstructorArgs) => InvokableInstance<
          (...args: [...positional: Positional, named: Named]) => Return
        >),
    args?: NamedArgs<GivenArgs>
  ): null | PartiallyAppliedComponent<
    abstract new (...args: ConstructorArgs) => InvokableInstance<
      (...args: [...positional: Positional, named: Named]) => Return
    >,
    keyof UnwrapNamedArgs<GivenArgs>
  >;
}>;
