import {
  ResolutionKey,
  TemplateContext,
  AcceptsBlocks,
  NoNamedArgs,
  CreatesModifier,
  NoYields,
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

declare const YieldTypes: unique symbol;

declare const ResolveTestComponent: unique symbol;
declare class TestComponent<Args, Yields = NoYields> {
  readonly args: Args;
  [YieldTypes]: Yields;
  [ResolutionKey]: typeof ResolveTestComponent;
}

declare module '@glint/template/resolution-rules' {
  export interface ContextResolutions<Host> {
    [ResolveTestComponent]: Host extends TestComponent<infer Args, infer Yields>
      ? TemplateContext<Host, Args, Yields>
      : never;
  }

  export interface SignatureResolutions<InvokedValue> {
    [ResolveTestComponent]: InvokedValue extends TestComponent<infer Args, infer Yields>
      ? (args: Args) => AcceptsBlocks<Yields>
      : never;
  }
}
