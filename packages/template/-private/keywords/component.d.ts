import { AcceptsBlocks, AnyBlocks } from '../signature';
import { Invokable } from '../resolution';

export type ComponentKeyword = Invokable<{
  <
    Args,
    GivenArgs extends Partial<Args>,
    Blocks extends AnyBlocks,
    ConstructorArgs extends unknown[]
  >(
    args: GivenArgs,
    component: new (...args: ConstructorArgs) => Invokable<(args: Args) => AcceptsBlocks<Blocks>>
  ): new () => Invokable<
    (
      args: Omit<Args, keyof GivenArgs> & Partial<Pick<Args, keyof GivenArgs & keyof Args>>
    ) => AcceptsBlocks<Blocks>
  >;
}>;
