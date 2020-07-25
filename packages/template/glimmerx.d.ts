// Import this module to enable resolution rules for GlimmerX

import { NoNamedArgs, CreatesModifier } from '@glint/template/-private';
import { Invokable, ReturnsValue } from '@glint/template/-private';
import { ResolutionKey } from '@glint/template/-private';
import { TemplateContext, AcceptsBlocks } from '@glint/template/-private';
import GlimmerXComponent, { ResolveGlimmerXComponent } from '@glimmerx/component';

declare module '@glimmerx/modifier' {
  export function on<Name extends keyof HTMLElementEventMap>(
    args: NoNamedArgs,
    name: Name,
    callback: (event: HTMLElementEventMap[Name]) => void
  ): CreatesModifier;

  export const action: MethodDecorator;
}

declare module '@glimmerx/helper' {
  export function helper<Result, Named = NoNamedArgs, Positional extends unknown[] = []>(
    fn: (positional: Positional, named: Named) => Result
  ): Invokable<(args: Named, ...positional: Positional) => ReturnsValue<Result>>;
}

declare module '@glimmerx/component' {
  const ResolveGlimmerXComponent: unique symbol;

  export default interface Component<Args> {
    [ResolutionKey]: typeof ResolveGlimmerXComponent;
  }
}

declare module '@glint/template/resolution-rules' {
  type Constructor<T> = new (...args: any) => T;

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
