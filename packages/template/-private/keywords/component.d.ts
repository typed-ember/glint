import { ComponentReturn, AnyBlocks, DirectInvokable, Invokable } from '../integration';

export type ComponentKeyword = DirectInvokable<{
  <
    Args,
    GivenArgs extends Partial<Args>,
    Blocks extends AnyBlocks,
    ConstructorArgs extends unknown[]
  >(
    args: GivenArgs,
    component: new (...args: ConstructorArgs) => Invokable<(args: Args) => ComponentReturn<Blocks>>
  ): new () => Invokable<
    (
      args: Omit<Args, keyof GivenArgs> & Partial<Pick<Args, keyof GivenArgs & keyof Args>>
    ) => ComponentReturn<Blocks>
  >;
}>;
