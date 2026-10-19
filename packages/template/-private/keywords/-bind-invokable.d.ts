import { DirectInvokable, Invokable, NamedArgs } from '../integration';
import { MaybeNamed, PrebindArgs, SliceFrom, SliceTo, UnionKeysOf } from '../signature';

type PrefixOf<T extends unknown[]> = T extends [arg: infer Arg, ...rest: infer Rest]
  ? [] | [Arg, ...PrefixOf<Rest>]
  : T;

export type BindInvokableKeyword<Prefix extends number, Kind> = DirectInvokable<
  BindInvokableSignatures<Prefix, Kind> &
    (Prefix extends 1 ? BindElementPositional<Kind> : unknown) &
    BindNullablePositional<Prefix, Kind>
>;

type BindInvokableSignatures<Prefix extends number, Kind> = {
  // {{bind invokable}}
  <Args extends unknown[], T extends Kind>(
    invokable: (...args: Args) => T,
  ): Invokable<(...args: Args) => T>;
  <Args extends unknown[], T extends Kind>(
    invokable: ((...args: Args) => T) | null | undefined,
  ): null | Invokable<(...args: Args) => T>;
  // {{bind invokableWithOnlyNamedArgs name="foo"}}
  <Named, Return extends Kind, GivenNamed>(
    invokable: (named: NamedArgs<Named>) => Return,
    named: NamedArgs<Partial<Named> & GivenNamed>,
  ): Invokable<
    (
      ...named: MaybeNamed<PrebindArgs<NonNullable<Named>, keyof GivenNamed & UnionKeysOf<Named>>>
    ) => Return
  >;
  <Named, Return extends Kind, GivenNamed>(
    invokable: null | undefined | ((named: NamedArgs<Named>) => Return),
    named: NamedArgs<Partial<Named> & GivenNamed>,
  ): null | Invokable<
    (
      ...named: MaybeNamed<PrebindArgs<NonNullable<Named>, keyof GivenNamed & UnionKeysOf<Named>>>
    ) => Return
  >;
  // {{bind invokableWithNamedAndPositionalArgs name="foo"}}
  <Named, Positional extends unknown[], Return extends Kind, GivenNamed extends Partial<Named>>(
    invokable: (...args: [...Positional, NamedArgs<Named>]) => Return,
    named: NamedArgs<GivenNamed>,
  ): Invokable<
    (
      ...args: [
        ...Positional,
        ...MaybeNamed<PrebindArgs<NonNullable<Named>, keyof GivenNamed & UnionKeysOf<Named>>>,
      ]
    ) => Return
  >;
  <Named, Positional extends unknown[], Return extends Kind, GivenNamed extends Partial<Named>>(
    invokable: null | undefined | ((...args: [...Positional, NamedArgs<Named>]) => Return),
    named: NamedArgs<GivenNamed>,
  ): null | Invokable<
    (
      ...args: [
        ...Positional,
        ...MaybeNamed<PrebindArgs<NonNullable<Named>, keyof GivenNamed & UnionKeysOf<Named>>>,
      ]
    ) => Return
  >;
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
};

// {{modifier invokable positional}} for a generic modifier such as `on`.
// The overloads above infer `Positional` from the modifier's signature,
// which erases its type parameters. Here each given argument has its own
// `const` type parameter, so TS instantiates the modifier from the given
// arguments: `{{modifier on "click" this.onClick}}` binds `Name` to "click".
type BindElementPositional<Kind> = {
  <El, const A, Return extends Kind, Rest extends unknown[]>(
    invokable: (element: El, a: A, ...rest: Rest) => Return,
    a: A,
  ): Invokable<(element: El, ...rest: Rest) => Return>;
  <El, const A, const B, Return extends Kind, Rest extends unknown[]>(
    invokable: (element: El, a: A, b: B, ...rest: Rest) => Return,
    a: A,
    b: B,
  ): Invokable<(element: El, ...rest: Rest) => Return>;
  <El, const A, const B, const C, Return extends Kind, Rest extends unknown[]>(
    invokable: (element: El, a: A, b: B, c: C, ...rest: Rest) => Return,
    a: A,
    b: B,
    c: C,
  ): Invokable<(element: El, ...rest: Rest) => Return>;
  <El, const A, const B, const C, const D, Return extends Kind, Rest extends unknown[]>(
    invokable: (element: El, a: A, b: B, c: C, d: D, ...rest: Rest) => Return,
    a: A,
    b: B,
    c: C,
    d: D,
  ): Invokable<(element: El, ...rest: Rest) => Return>;
  <El, const A, Return extends Kind, Rest extends unknown[]>(
    invokable: null | undefined | ((element: El, a: A, ...rest: Rest) => Return),
    a: A,
  ): null | Invokable<(element: El, ...rest: Rest) => Return>;
  <El, const A, const B, Return extends Kind, Rest extends unknown[]>(
    invokable: null | undefined | ((element: El, a: A, b: B, ...rest: Rest) => Return),
    a: A,
    b: B,
  ): null | Invokable<(element: El, ...rest: Rest) => Return>;
  <El, const A, const B, const C, Return extends Kind, Rest extends unknown[]>(
    invokable: null | undefined | ((element: El, a: A, b: B, c: C, ...rest: Rest) => Return),
    a: A,
    b: B,
    c: C,
  ): null | Invokable<(element: El, ...rest: Rest) => Return>;
  <El, const A, const B, const C, const D, Return extends Kind, Rest extends unknown[]>(
    invokable: null | undefined | ((element: El, a: A, b: B, c: C, d: D, ...rest: Rest) => Return),
    a: A,
    b: B,
    c: C,
    d: D,
  ): null | Invokable<(element: El, ...rest: Rest) => Return>;
};

type BindNullablePositional<Prefix extends number, Kind> = {
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
};
