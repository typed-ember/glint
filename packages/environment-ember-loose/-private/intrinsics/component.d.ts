import { WithBoundArgs } from '@glint/template';
import {
  ComponentReturn,
  EmptyObject,
  DirectInvokable,
  InvokableInstance,
  Invokable,
  AnyFunction,
  NamedArgNames,
  NamedArgs,
  UnwrapNamedArgs,
} from '@glint/template/-private/integration';

type ComponentNamedArgs<Component> = Component extends Invokable<(...args: infer Args) => any>
  ? Args extends [...positional: infer _, named?: infer Named]
    ? UnwrapNamedArgs<Named>
    : EmptyObject
  : EmptyObject;

type PartiallyAppliedComponent<Component, Args> = Component extends Invokable<AnyFunction>
  ? WithBoundArgs<
      Component,
      Exclude<Args extends NamedArgNames<Component> ? Args : never, typeof NamedArgs>
    >
  : never;

export type ComponentKeyword<Registry> = DirectInvokable<{
  // {{component "some-name"}}
  <Name extends keyof Registry>(component: Name): Registry[Name];
  <Name extends keyof Registry>(component: Name | null | undefined): Registry[Name] | null;

  // {{component "some-name" arg=value}}
  <Name extends keyof Registry, GivenArgs extends Partial<ComponentNamedArgs<Registry[Name]>>>(
    component: Name,
    args: NamedArgs<GivenArgs>
  ): PartiallyAppliedComponent<Registry[Name], keyof GivenArgs>;
  <Name extends keyof Registry, GivenArgs extends Partial<ComponentNamedArgs<Registry[Name]>>>(
    component: Name | null | undefined,
    args: NamedArgs<GivenArgs>
  ): null | PartiallyAppliedComponent<Registry[Name], keyof GivenArgs>;

  // {{component someCurriedComponent arg=value}}
  <
    Named,
    Positional extends unknown[],
    GivenArgs extends Partial<Named>,
    Return extends ComponentReturn<any, any>,
    ConstructorArgs extends unknown[]
  >(
    component: abstract new (...args: ConstructorArgs) => InvokableInstance<
      (...args: [...positional: Positional, named: Named]) => Return
    >,
    args: NamedArgs<GivenArgs>
  ): PartiallyAppliedComponent<
    abstract new (...args: ConstructorArgs) => InvokableInstance<
      (...args: [...positional: Positional, named: Named]) => Return
    >,
    keyof UnwrapNamedArgs<GivenArgs>
  >;
  <
    Named,
    Positional extends unknown[],
    GivenArgs extends Partial<Named>,
    Return extends ComponentReturn<any, any>,
    ConstructorArgs extends unknown[]
  >(
    component:
      | null
      | undefined
      | (abstract new (...args: ConstructorArgs) => InvokableInstance<
          (...args: [...positional: Positional, named: Named]) => Return
        >),
    args: NamedArgs<GivenArgs>
  ): null | PartiallyAppliedComponent<
    abstract new (...args: ConstructorArgs) => InvokableInstance<
      (...args: [...positional: Positional, named: Named]) => Return
    >,
    keyof UnwrapNamedArgs<GivenArgs>
  >;
}>;
