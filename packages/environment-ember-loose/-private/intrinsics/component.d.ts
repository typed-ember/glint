import {
  ComponentReturn,
  EmptyObject,
  DirectInvokable,
  InvokableInstance,
} from '@glint/template/-private/integration';

type RegistryComponentArgs<Registry, T extends keyof Registry> = Registry[T] extends abstract new (
  ...args: never[]
) => InvokableInstance<(args: infer Args, ...rest: any) => any>
  ? Args
  : EmptyObject;

type RegistryComponentReturn<
  Registry,
  T extends keyof Registry
> = Registry[T] extends abstract new (...args: never[]) => InvokableInstance<(...args: any) => infer Return>
  ? Return
  : unknown;

type PartiallyAppliedComponent<AllArgs, GivenArgs, Return> = InvokableInstance<
  (
    args: Omit<AllArgs, keyof GivenArgs> & Partial<Pick<AllArgs, keyof GivenArgs & keyof AllArgs>>
  ) => Return
>;

export type ComponentKeyword<Registry> = DirectInvokable<{
  // {{component "some-name"}}
  <Name extends keyof Registry>(args: EmptyObject, component: Name): Registry[Name];
  <Name extends keyof Registry>(args: EmptyObject, component: Name | null | undefined):
    | Registry[Name]
    | null;

  // {{component "some-name" arg=value}}
  <Name extends keyof Registry, GivenArgs extends Partial<RegistryComponentArgs<Registry, Name>>>(
    args: GivenArgs,
    component: Name
  ): abstract new () => PartiallyAppliedComponent<
    RegistryComponentArgs<Registry, Name>,
    GivenArgs,
    RegistryComponentReturn<Registry, Name>
  >;
  <Name extends keyof Registry, GivenArgs extends Partial<RegistryComponentArgs<Registry, Name>>>(
    args: GivenArgs,
    component: Name | null | undefined
  ):
    | null
    | (abstract new () => PartiallyAppliedComponent<
        RegistryComponentArgs<Registry, Name>,
        GivenArgs,
        RegistryComponentReturn<Registry, Name>
      >);

  // {{component someCurriedComponent arg=value}}
  <
    Args,
    GivenArgs extends Partial<Args>,
    Return extends ComponentReturn<any, any>,
    ConstructorArgs extends unknown[]
  >(
    args: GivenArgs,
    component: abstract new (...args: ConstructorArgs) => InvokableInstance<(args: Args) => Return>
  ): abstract new () => PartiallyAppliedComponent<Args, GivenArgs, Return>;
  <
    Args,
    GivenArgs extends Partial<Args>,
    Return extends ComponentReturn<any, any>,
    ConstructorArgs extends unknown[]
  >(
    args: GivenArgs,
    component:
      | (abstract new (...args: ConstructorArgs) => InvokableInstance<(args: Args) => Return>)
      | null
      | undefined
  ): null | (abstract new () => PartiallyAppliedComponent<Args, GivenArgs, Return>);
}>;
