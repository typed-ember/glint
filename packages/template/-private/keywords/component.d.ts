import { AnySignature, AnyBlocks, ReturnsValue, AcceptsBlocks } from '../signature';
import { ResolveSignature } from '../resolution';
import { Invokable } from '../invoke';

type SignatureFor<T> = T extends AnySignature ? T : ResolveSignature<T>;

type ArgsFor<T> = SignatureFor<T> extends (args: infer Args) => unknown ? Args : {};

type PositionalFor<T> = SignatureFor<T> extends (
  args: never,
  ...positional: infer Positional
) => unknown
  ? Positional
  : never[];

type BlocksFor<T> = SignatureFor<T> extends (...params: never) => (blocks: infer Blocks) => unknown
  ? Blocks extends Partial<AnyBlocks>
    ? Blocks
    : {}
  : {};

export default interface ComponentKeyword {
  <Component, GivenArgs extends keyof ArgsFor<Component>>(
    args: { [Arg in GivenArgs]: ArgsFor<Component>[Arg] },
    component: Component
  ): ReturnsValue<
    Invokable<
      (
        args: Omit<ArgsFor<Component>, GivenArgs> & Partial<Pick<ArgsFor<Component>, GivenArgs>>,
        ...positional: PositionalFor<Component>
      ) => AcceptsBlocks<BlocksFor<Component>>
    >
  >;
}
