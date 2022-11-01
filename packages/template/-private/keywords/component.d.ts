import { ComponentReturn, AnyBlocks, DirectInvokable, InvokableInstance } from '../integration';

export type ComponentKeyword = DirectInvokable<{
  <
    Args,
    GivenArgs extends Partial<Args>,
    Blocks extends AnyBlocks,
    ConstructorArgs extends unknown[]
  >(
    args: GivenArgs,
    component: new (...args: ConstructorArgs) => InvokableInstance<
      (args: Args) => ComponentReturn<Blocks>
    >
  ): new () => InvokableInstance<
    (
      args: Omit<Args, keyof GivenArgs> & Partial<Pick<Args, keyof GivenArgs & keyof Args>>
    ) => ComponentReturn<Blocks>
  >;
}>;
