// This module is responsible for augmenting the upstream definitions of entities that interact
// with templates to include the information necessary for Glint to typecheck them.
import { ComponentLike, HelperLike } from '@glint/template';
import {
  BoundModifier,
  Context,
  DirectInvokable,
  EmptyObject,
  FlattenBlockParams,
  TemplateContext,
} from '@glint/template/-private/integration';

//////////////////////////////////////////////////////////////////////
// Components

import '@glimmerx/component';

import { ExpandSignature } from '@glimmer/component/-private/component';

// Declaring that `hbs` returns a `TemplateComponent` prevents vanilla `tsc` from freaking out when
// it sees code like `const MyThing: TC<Sig> = hbs...`. Glint itself will never see `hbs` get used, as
// it's transformed to the template DSL before typechecking.
type ComponentContext<This, S> = TemplateContext<
  This,
  ExpandSignature<S>['Args']['Named'],
  FlattenBlockParams<ExpandSignature<S>['Blocks']>,
  ExpandSignature<S>['Element']
>;

declare module '@glimmerx/component' {
  export default interface Component<S> extends InstanceType<ComponentLike<S>> {
    [Context]: ComponentContext<this, S>;
  }

  export interface TemplateComponentInstance<S> extends InstanceType<ComponentLike<S>> {
    [Context]: ComponentContext<null, S>;
  }
}

//////////////////////////////////////////////////////////////////////
// Helpers

import '@glimmerx/helper';

type _FnHelper = DirectInvokable<{
  <Ret, Args extends unknown[]>(args: EmptyObject, f: (...rest: Args) => Ret): (
    ...rest: Args
  ) => Ret;
  <A, Ret, Args extends unknown[]>(args: EmptyObject, f: (a: A, ...rest: Args) => Ret, a: A): (
    ...rest: Args
  ) => Ret;
  <A, B, Ret, Args extends unknown[]>(
    args: EmptyObject,
    f: (a: A, b: B, ...rest: Args) => Ret,
    a: A,
    b: B
  ): (...rest: Args) => Ret;
  <A, B, C, Ret, Args extends unknown[]>(
    args: EmptyObject,
    f: (a: A, b: B, c: C, ...rest: Args) => Ret,
    a: A,
    b: B,
    c: C
  ): (...rest: Args) => Ret;
  <A, B, C, D, Ret, Args extends unknown[]>(
    args: EmptyObject,
    f: (a: A, b: B, c: C, d: D, ...rest: Args) => Ret,
    a: A,
    b: B,
    c: C,
    d: D
  ): (...rest: Args) => Ret;
  <A, B, C, D, E, Ret, Args extends unknown[]>(
    args: EmptyObject,
    f: (a: A, b: B, c: C, d: D, e: E, ...rest: Args) => Ret,
    a: A,
    b: B,
    c: C,
    d: D,
    e: E
  ): (...rest: Args) => Ret;
  <A, B, C, D, E, G, Ret, Args extends unknown[]>(
    args: EmptyObject,
    f: (a: A, b: B, c: C, d: D, e: E, g: G, ...rest: Args) => Ret,
    a: A,
    b: B,
    c: C,
    d: D,
    e: E,
    g: G
  ): (...rest: Args) => Ret;
}>;

declare module '@glimmerx/helper/dist/commonjs/src/helper' {
  export interface HelperInstance<S> extends InstanceType<HelperLike<S>> {}
}

declare module '@glimmerx/helper' {
  export interface FnHelper extends _FnHelper {}
}

//////////////////////////////////////////////////////////////////////
// Modifiers

import '@glimmerx/modifier';

export interface OnModifierArgs {
  capture?: boolean;
  once?: boolean;
  passive?: boolean;
}

type _OnModifier = DirectInvokable<{
  // There may be a ver event types not covered in HTMLElementEventMap, but we'll just default to Event
  <Name extends keyof HTMLElementEventMap>(
    args: OnModifierArgs,
    name: Name,
    callback: (event: HTMLElementEventMap[Name]) => void
  ): BoundModifier<Element>;
  (args: OnModifierArgs, name: string, callback: (event: Event) => void): BoundModifier<Element>;
}>;

declare module '@glimmerx/modifier' {
  export interface OnModifier extends _OnModifier {}
}
