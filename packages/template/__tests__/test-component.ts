import {
  TemplateContext,
  AcceptsBlocks,
  CreatesModifier,
  NoNamedArgs,
  Invoke,
  ContextType,
} from '@glint/template/-private';
import { LetKeyword } from '@glint/template/-private/keywords';
import { RootElement } from '../-private/attributes';
import { DirectInvokable } from '../-private/resolution';
import { EmptyObject } from '../-private/signature';

// This module contains a `@glimmer/component`-like base class and the
// declarations necessary for it to be used as a component in glint, as
// well as simple examples of a helper and modifier.

export default TestComponent;
export declare const globals: {
  let: LetKeyword;
  on: DirectInvokable<
    <T extends keyof HTMLElementEventMap>(
      args: NoNamedArgs,
      event: T,
      callback: (event: HTMLElementEventMap[T]) => void
    ) => CreatesModifier
  >;
};

type Get<T, K, Otherwise = EmptyObject> = K extends keyof T ? Exclude<T[K], undefined> : Otherwise;

export interface ComponentSignature {
  Args?: Record<string, unknown>;
  Yields?: Record<string, unknown[] | undefined>;
  Element?: Element;
}

declare class TestComponent<T extends ComponentSignature = {}> {
  readonly args: Get<T, 'Args'>;
  [Invoke]: (args: Get<T, 'Args'>) => AcceptsBlocks<Get<T, 'Yields'>>;
  [RootElement]: Get<T, 'Element', null>;
  [ContextType]: TemplateContext<this, Get<T, 'Args'>, Get<T, 'Yields'>, Get<T, 'Element', null>>;
}
