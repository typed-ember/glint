import { NoNamedArgs, CreatesModifier } from '@glint/template/-private';
import { Invokable, ReturnsValue } from '@glint/template/-private';
import { ResolutionKey } from '@glint/template/-private';
import { TemplateContext, AcceptsBlocks } from '@glint/template/-private';
import GlimmerXComponent from '@glimmerx/component';

type Constructor<T> = new (...args: any) => T;

declare const ResolveGlimmerXComponent: unique symbol;

declare module '@glint/template/resolution-rules' {
  export interface ContextResolutions<Host> {
    [ResolveGlimmerXComponent]: Host extends GlimmerXComponent<infer Args>
      ? TemplateContext<Host, Args>
      : never;
  }

  export interface SignatureResolutions<InvokedValue> {
    [ResolveGlimmerXComponent]: InvokedValue extends Constructor<GlimmerXComponent<infer Args>>
      ? InvokedValue extends { template: Invokable<infer Signature> }
        ? Signature
        : (args: Args) => AcceptsBlocks<{ default?: [] }>
      : never;
  }
}

declare module '@glimmerx/component' {
  export default interface Component<Args> {
    [ResolutionKey]: typeof ResolveGlimmerXComponent;
  }
}

declare module '@glimmerx/modifier' {
  export function on<Name extends keyof HTMLElementEventMap>(
    args: NoNamedArgs,
    name: Name,
    callback: (event: HTMLElementEventMap[Name]) => void
  ): CreatesModifier;
}

declare module '@glimmerx/helper' {
  export function helper<Result, Named = NoNamedArgs, Positional extends unknown[] = []>(
    fn: (positional: Positional, named: Named) => Result
  ): Invokable<(args: Named, ...positional: Positional) => ReturnsValue<Result>>;

  export function fn<Ret, Args extends unknown[]>(
    args: NoNamedArgs,
    f: (...rest: Args) => Ret
  ): ReturnsValue<(...rest: Args) => Ret>;
  export function fn<A, Ret, Args extends unknown[]>(
    args: NoNamedArgs,
    f: (a: A, ...rest: Args) => Ret,
    a: A
  ): ReturnsValue<(...rest: Args) => Ret>;
  export function fn<A, B, Ret, Args extends unknown[]>(
    args: NoNamedArgs,
    f: (a: A, b: B, ...rest: Args) => Ret,
    a: A,
    b: B
  ): ReturnsValue<(...rest: Args) => Ret>;
  export function fn<A, B, C, Ret, Args extends unknown[]>(
    args: NoNamedArgs,
    f: (a: A, b: B, c: C, ...rest: Args) => Ret,
    a: A,
    b: B,
    c: C
  ): ReturnsValue<(...rest: Args) => Ret>;
  export function fn<A, B, C, D, Ret, Args extends unknown[]>(
    args: NoNamedArgs,
    f: (a: A, b: B, c: C, d: D, ...rest: Args) => Ret,
    a: A,
    b: B,
    c: C,
    d: D
  ): ReturnsValue<(...rest: Args) => Ret>;
}
