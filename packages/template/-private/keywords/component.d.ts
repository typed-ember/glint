import {
  AnyFunction,
  AnyContext,
  ComponentReturn,
  DirectInvokable,
  FlattenBlockParams,
  HasContext,
  Invokable,
  InvokeDirect,
  NamedArgNames,
  NamedArgs,
  UnwrapNamedArgs,
} from '../integration';
import { ComponentLike, WithBoundArgs } from '../index';
import {
  ComponentSignatureArgs,
  ComponentSignatureElement,
  Get,
  MaybeNamed,
  PrebindArgs,
} from '../signature';
import { BindInvokableKeyword } from './-bind-invokable';

type BoundComponentFromContext<Context extends AnyContext, GivenKeys extends PropertyKey> = Invokable<
  (...named: MaybeNamed<PrebindArgs<NamedArgs<Context['args']>, GivenKeys>>) => ComponentReturn<
    FlattenBlockParams<Context['blocks']>,
    Context['element']
  >
>;

type BoundComponentLikeFromSignature<
  S,
  GivenNamed extends keyof ComponentSignatureArgs<S>['Named'],
> = ComponentLike<{
  Args: S extends { Args: infer Args }
    ? Args extends { Named?: object; Positional?: unknown[] }
      ? {
          Named: PrebindArgs<
            Get<S['Args'], 'Named', {}>,
            GivenNamed & keyof Get<S['Args'], 'Named', {}>
          >;
          Positional: Get<S['Args'], 'Positional', []>;
        }
      : PrebindArgs<Get<S, 'Args', {}>, GivenNamed & keyof Get<S, 'Args', {}>>
    : PrebindArgs<{}, never>;
  Blocks: Get<S, 'Blocks', {}>;
  Element: ComponentSignatureElement<S>;
}>;

type SignatureFor<T extends ComponentLike<any>> = T extends ComponentLike<infer S> ? S : never;

type ComponentLikeNamedArgs<T extends Invokable<AnyFunction>> =
  T extends Invokable<(...args: infer Args) => ComponentReturn<any, any>>
    ? Args extends [...positional: infer _, named?: infer Named]
      ? UnwrapNamedArgs<NonNullable<Named>>
      : never
    : never;

type ComponentKeywordBase = BindInvokableKeyword<0, ComponentReturn<any, any>>[typeof InvokeDirect];

type ComponentKeywordFastPath = {
  <Context extends AnyContext, C extends abstract new (...args: any[]) => HasContext<Context>, GivenNamed extends Partial<Context['args']>>(
    component: C,
    named: NamedArgs<GivenNamed>,
  ): BoundComponentFromContext<Context, keyof GivenNamed>;
  <Context extends AnyContext, C extends abstract new (...args: any[]) => HasContext<Context>, GivenNamed extends Partial<Context['args']>>(
    component: C | null | undefined,
    named: NamedArgs<GivenNamed>,
  ): null | BoundComponentFromContext<Context, keyof GivenNamed>;
  <T extends ComponentLike<any>, GivenNamed extends Partial<ComponentSignatureArgs<SignatureFor<T>>['Named']>>(
    component: T,
    named: NamedArgs<GivenNamed>,
  ): BoundComponentLikeFromSignature<
    SignatureFor<T>,
    keyof GivenNamed & keyof ComponentSignatureArgs<SignatureFor<T>>['Named']
  >;
  <T extends ComponentLike<any>, GivenNamed extends Partial<ComponentSignatureArgs<SignatureFor<T>>['Named']>>(
    component: T | null | undefined,
    named: NamedArgs<GivenNamed>,
  ): null | BoundComponentLikeFromSignature<
    SignatureFor<T>,
    keyof GivenNamed & keyof ComponentSignatureArgs<SignatureFor<T>>['Named']
  >;
  <T extends Invokable<AnyFunction>, GivenNamed extends NamedArgNames<T>>(
    component: T,
    named: NamedArgs<Partial<ComponentLikeNamedArgs<T>> & Pick<ComponentLikeNamedArgs<T>, GivenNamed>>,
  ): WithBoundArgs<T, GivenNamed>;
  <T extends Invokable<AnyFunction>, GivenNamed extends NamedArgNames<T>>(
    component: T | null | undefined,
    named: NamedArgs<Partial<ComponentLikeNamedArgs<T>> & Pick<ComponentLikeNamedArgs<T>, GivenNamed>>,
  ): null | WithBoundArgs<T, GivenNamed>;
};

export type ComponentKeyword = DirectInvokable<ComponentKeywordFastPath & ComponentKeywordBase>;
