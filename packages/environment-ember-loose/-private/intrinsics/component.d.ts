import {
  AcceptsBlocks,
  AnyBlocks,
  EmptyObject,
  DirectInvokable,
  Invokable,
  HasElement,
  ElementInvokable,
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

type RegistryComponentElement<Registry, T extends keyof Registry> = Registry[T] extends new (
  ...args: any
) => HasElement<infer El>
  ? El
  : null;

export type ComponentKeyword<Registry> = DirectInvokable<{
  // {{component "some-name"}}
  <Name extends keyof Registry>(args: EmptyObject, component: Name): Registry[Name];

  // {{component "some-name" arg=value}}
  <Name extends keyof Registry, GivenArgs extends Partial<RegistryComponentArgs<Registry, Name>>>(
    args: GivenArgs,
    component: Name
  ): new () => ElementInvokable<
    RegistryComponentElement<Registry, Name>,
    {
      (
        args: Omit<RegistryComponentArgs<Registry, Name>, keyof GivenArgs> &
          Partial<
            Pick<
              RegistryComponentArgs<Registry, Name>,
              keyof GivenArgs & keyof RegistryComponentArgs<Registry, Name>
            >
          >
      ): RegistryComponentReturn<Registry, Name>;
    }
  >;

  // {{component someCurriedComponent arg=value}}
  <
    Args,
    GivenArgs extends Partial<Args>,
    Blocks extends AnyBlocks,
    ConstructorArgs extends unknown[],
    El extends Element | null
  >(
    args: GivenArgs,
    component: new (...args: ConstructorArgs) => ElementInvokable<
      El,
      (args: Args) => AcceptsBlocks<Blocks>
    >
  ): new () => ElementInvokable<
    El,
    {
      (
        args: Omit<Args, keyof GivenArgs> & Partial<Pick<Args, keyof GivenArgs & keyof Args>>
      ): AcceptsBlocks<Blocks>;
    }
  >;
}>;
