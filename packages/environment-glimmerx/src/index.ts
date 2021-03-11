// This module re-exports values from `@glimmerx/{component,modifier,helper}` in a way that's
// compatible with glint types.
// In the future we will hopefully be able to avoid this and have the upstream packages ship types
// that are, if not glint-aware, at least glint-compatible.

import * as glimmerxComponent from '@glimmerx/component';
import * as glimmerxModifier from '@glimmerx/modifier';
import * as glimmerxHelper from '@glimmerx/helper';

export * from '@glimmerx/component';
export * from '@glimmerx/modifier';
export * from '@glimmerx/helper';

import type { CreatesModifier } from '@glint/template/-private';
import type { ContextType, Invoke } from '@glint/template/-private';
import type { TemplateContext, AcceptsBlocks } from '@glint/template/-private';
import type { Invokable } from '@glint/template/-private/resolution';
import type { EmptyObject } from '@glint/template/-private/signature';

type Get<T, Key, Otherwise = EmptyObject> = Key extends keyof T
  ? Exclude<T[Key], undefined>
  : Otherwise;

export const on = (glimmerxModifier.on as unknown) as OnModifier;
export const fn = (glimmerxHelper.fn as unknown) as FnHelper;
export const helper = (glimmerxHelper.helper as unknown) as HelperFactory;

export interface ComponentSignature {
  Args?: Partial<Record<string, unknown>>;
  Yields?: Partial<Record<string, Array<unknown>>>;
}

export const Component = glimmerxComponent.default as new <
  T extends ComponentSignature = {}
>() => Component<T>;
export interface Component<T extends ComponentSignature = {}>
  extends glimmerxComponent.default<Get<T, 'Args'> & {}> {
  [Invoke]: (args: Get<T, 'Args'>) => AcceptsBlocks<Get<T, 'Yields'>>;
  [ContextType]: TemplateContext<this, Get<T, 'Args'>, Get<T, 'Yields'>>;
}

type OnModifier = Invokable<
  <Name extends keyof HTMLElementEventMap>(
    args: EmptyObject,
    name: Name,
    callback: (event: HTMLElementEventMap[Name]) => void
  ) => CreatesModifier
>;

type HelperFactory = <Result, Named = EmptyObject, Positional extends unknown[] = []>(
  fn: (positional: Positional, named: Named) => Result
) => new () => Invokable<(args: Named, ...positional: Positional) => Result>;

type FnHelper = Invokable<{
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
}>;
