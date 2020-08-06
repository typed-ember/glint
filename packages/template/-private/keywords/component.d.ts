import { AnyBlocks, AcceptsBlocks } from '../signature';
import { ResolveSignature, Resolvable } from '../resolution';

type SignatureFor<T> = T extends Resolvable<any> ? ResolveSignature<T> : T;

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
  ): (
    args: Omit<ArgsFor<Component>, GivenArgs> & Partial<Pick<ArgsFor<Component>, GivenArgs>>,
    ...positional: PositionalFor<Component>
  ) => AcceptsBlocks<BlocksFor<Component>>;
}
