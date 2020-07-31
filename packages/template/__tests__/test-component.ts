import {
  ResolutionKey,
  TemplateContext,
  AcceptsBlocks,
  Invokable,
  NoNamedArgs,
  CreatesModifier,
} from '@glint/template/-private';
import { LetKeyword } from '@glint/template/-private/keywords';

// This module contains a `@glimmer/component`-like base class and the
// declarations necessary for it to be used as a component in glint, as
// well as simple examples of a helper and modifier.

export default TestComponent;
export declare const globals: {
  let: LetKeyword;
  on: <T extends keyof HTMLElementEventMap>(
    args: NoNamedArgs,
    event: T,
    callback: (event: HTMLElementEventMap[T]) => void
  ) => CreatesModifier;
};

declare const ResolveTestComponent: unique symbol;
declare class TestComponent<T> {
  readonly args: T;
  [ResolutionKey]: typeof ResolveTestComponent;
}

type Constructor<T> = new (...args: any) => T;

declare module '@glint/template/resolution-rules' {
  export interface ContextResolutions<Host> {
    [ResolveTestComponent]: Host extends TestComponent<infer Args>
      ? TemplateContext<Host, Args>
      : never;
  }

  export interface SignatureResolutions<InvokedValue> {
    [ResolveTestComponent]: InvokedValue extends Constructor<TestComponent<infer Args>>
      ? InvokedValue extends { template: Invokable<infer Signature> }
        ? Signature
        : (args: Args) => AcceptsBlocks<{ default?: [] }>
      : never;
  }
}
