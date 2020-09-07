import { AcceptsBlocks, AnyBlocks } from '../signature';
import { HasSignature } from '../resolution';

export default interface ComponentKeyword {
  // Invoking with a component class
  <
    Args,
    GivenArgs extends Partial<Args>,
    Blocks extends AnyBlocks,
    ConstructorArgs extends unknown[]
  >(
    args: GivenArgs,
    component: new (...args: ConstructorArgs) => HasSignature<(args: Args) => AcceptsBlocks<Blocks>>
  ): (
    args: Omit<Args, keyof GivenArgs> & Partial<Pick<Args, keyof GivenArgs & keyof Args>>
  ) => AcceptsBlocks<Blocks>;

  // Invoking with the result of another `{{component}}` expression
  <Args, GivenArgs extends Partial<Args>, Blocks extends AnyBlocks>(
    args: GivenArgs,
    component: (args: Args) => AcceptsBlocks<Blocks>
  ): (
    args: Omit<Args, keyof GivenArgs> & Partial<Pick<Args, keyof GivenArgs & keyof Args>>
  ) => AcceptsBlocks<Blocks>;
}
