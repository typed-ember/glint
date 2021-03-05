import {
  TemplateContext,
  AcceptsBlocks,
  CreatesModifier,
  NoNamedArgs,
  NoYields,
  Invoke,
  ContextType,
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

declare class TestComponent<Args, Yields = NoYields> {
  readonly args: Args;
  [Invoke]: (args: Args) => AcceptsBlocks<Yields>;
  [ContextType]: TemplateContext<this, Args, Yields>;
}
