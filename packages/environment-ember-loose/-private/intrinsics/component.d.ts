import {
  AcceptsBlocks,
  EmptyObject,
  DirectInvokable,
  Invokable,
} from '@glint/template/-private/integration';

type RegistryComponentArgs<Registry, T extends keyof Registry> = Registry[T] extends new (
  ...args: any
) => Invokable<(args: infer Args, ...rest: any) => any>
  ? Args
  : EmptyObject;

type RegistryComponentReturn<Registry, T extends keyof Registry> = Registry[T] extends new (
  ...args: any
) => Invokable<(...args: any) => infer Return>
  ? Return
  : unknown;

type PartiallyAppliedComponent<AllArgs, GivenArgs, Return> = Invokable<
  (
    args: Omit<AllArgs, keyof GivenArgs> & Partial<Pick<AllArgs, keyof GivenArgs & keyof AllArgs>>
  ) => Return
>;

export type ComponentKeyword<Registry> = DirectInvokable<{
  // {{component "some-name"}}
  <Name extends keyof Registry>(args: EmptyObject, component: Name): Registry[Name];

  // {{component "some-name" arg=value}}
  <Name extends keyof Registry, GivenArgs extends Partial<RegistryComponentArgs<Registry, Name>>>(
    args: GivenArgs,
    component: Name
  ): new () => PartiallyAppliedComponent<
    RegistryComponentArgs<Registry, Name>,
    GivenArgs,
    RegistryComponentReturn<Registry, Name>
  >;

  // {{component someCurriedComponent arg=value}}
  <
    Args,
    GivenArgs extends Partial<Args>,
    Return extends AcceptsBlocks<any, any>,
    ConstructorArgs extends unknown[]
  >(
    args: GivenArgs,
    component: new (...args: ConstructorArgs) => Invokable<(args: Args) => Return>
  ): new () => PartiallyAppliedComponent<Args, GivenArgs, Return>;
}>;
