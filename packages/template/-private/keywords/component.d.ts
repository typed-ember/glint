import { AcceptsBlocks } from '../signature';
import { HasSignature } from '../resolution';

type SignatureFor<T> = T extends HasSignature<infer Signature> ? Signature : T;

type ArgsFor<T> = SignatureFor<T> extends (args: infer Args) => unknown ? Args : {};

type PositionalFor<T> = SignatureFor<T> extends (
  args: never,
  ...positional: infer Positional
) => unknown
  ? Positional
  : never[];

type BlocksFor<T> = SignatureFor<T> extends (...params: never) => AcceptsBlocks<infer Blocks>
  ? Blocks
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
