import { DirectInvokable, Invokable, NamedArgs, UnwrapNamedArgs } from '../integration';
import { MaybeNamed, PrebindArgs, SliceFrom, SliceTo } from '../signature';

type PrefixOf<T extends unknown[]> = T extends [arg: infer Arg, ...rest: infer Rest]
  ? [] | [Arg, ...PrefixOf<Rest>]
  : T;

/**
 * Given Args, T, and keys of pre-bound args, produces the result function
 * type with those args made optional. Handles both required and optional
 * NamedArgs tuples (for double-currying).
 */
type BindNamedResult<Args, T, GivenNamed> = Args extends [NamedArgs<infer Named>]
  ? (
      ...named: MaybeNamed<
        PrebindArgs<NonNullable<Named>, keyof GivenNamed & keyof UnwrapNamedArgs<Named>>
      >
    ) => T
  : Args extends [NamedArgs<infer Named>?]
    ? (
        ...named: MaybeNamed<
          PrebindArgs<NonNullable<Named>, keyof GivenNamed & keyof UnwrapNamedArgs<Named>>
        >
      ) => T
    : Args extends [...infer Positional, NamedArgs<infer Named>]
      ? (
          ...args: [
            ...Positional,
            ...MaybeNamed<
              PrebindArgs<NonNullable<Named>, keyof GivenNamed & keyof UnwrapNamedArgs<Named>>
            >,
          ]
        ) => T
      : (...args: Args extends unknown[] ? Args : never) => T;

export type BindInvokableKeyword<Prefix extends number, Kind> = DirectInvokable<{
  // {{bind invokable}}
  <Args extends unknown[], T extends Kind>(
    invokable: (...args: Args) => T,
  ): Invokable<(...args: Args) => T>;
  <Args extends unknown[], T extends Kind>(
    invokable: ((...args: Args) => T) | null | undefined,
  ): null | Invokable<(...args: Args) => T>;

  // {{bind invokable name="foo"}} — generic-preserving named-args overloads (#1068).
  // Uses Args/T to capture the whole function type (preserving type params via
  // higher-order inference) and BindNamedResult for pre-binding.
  <Args extends unknown[], T extends Kind, GivenNamed>(
    invokable: (...args: Args) => T,
    named: NamedArgs<GivenNamed>,
  ): Invokable<BindNamedResult<Args, T, GivenNamed>>;
  <Args extends unknown[], T extends Kind, GivenNamed>(
    invokable: ((...args: Args) => T) | null | undefined,
    named: NamedArgs<GivenNamed>,
  ): null | Invokable<BindNamedResult<Args, T, GivenNamed>>;

  // {{bind invokable positional}}
  <
    Positional extends any[],
    Return extends Kind,
    GivenPositional extends PrefixOf<SliceFrom<Positional, Prefix>>,
  >(
    invokable: (...args: [...Positional]) => Return,
    ...args: GivenPositional
  ): Invokable<
    (
      ...args: [
        ...SliceTo<Positional, Prefix>,
        ...SliceFrom<SliceFrom<Positional, Prefix>, GivenPositional['length']>,
      ]
    ) => Return
  >;
  <
    Positional extends any[],
    Return extends Kind,
    GivenPositional extends PrefixOf<SliceFrom<Positional, Prefix>>,
  >(
    invokable: null | undefined | ((...args: [...Positional]) => Return),
    ...args: GivenPositional
  ): null | Invokable<
    (
      ...args: [
        ...SliceTo<Positional, Prefix>,
        ...SliceFrom<SliceFrom<Positional, Prefix>, GivenPositional['length']>,
      ]
    ) => Return
  >;
}>;
