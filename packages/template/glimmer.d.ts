// Import this module to enable resolution rules for Glimmer components

import GlimmerComponent from '@glimmer/component';
import {
  ResolutionKey,
  TemplateContext,
  Invokable,
  AcceptsBlocks,
  BlockResult,
} from '@glint/template/-private';

type Constructor<T> = new (...args: never[]) => T;

declare const ResolveGlimmerComponent: unique symbol;

declare module '@glimmer/component' {
  export default interface Component<Args> {
    [ResolutionKey]: typeof ResolveGlimmerComponent;
  }
}

declare module '@glint/template/resolution-rules' {
  export interface ContextResolutions<Host> {
    [ResolveGlimmerComponent]: Host extends GlimmerComponent<infer Args>
      ? TemplateContext<Host, Args>
      : never;
  }

  export interface SignatureResolutions<InvokedValue> {
    [ResolveGlimmerComponent]: InvokedValue extends Constructor<GlimmerComponent<infer Args>>
      ? InvokedValue extends { template: Invokable<infer Signature> }
        ? Signature
        : (args: Args) => AcceptsBlocks<{ default?(): BlockResult }>
      : never;
  }
}
