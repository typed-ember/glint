// This module contains a `@glimmer/component`-like base class and the
// declarations necessary for it to be used as a component in glint, as
// well as simple examples of a helper and modifier.

import {
  AcceptsBlocks,
  BoundModifier,
  Context,
  DirectInvokable,
  Element,
  EmptyObject,
  Invoke,
  TemplateContext,
} from '../-private/integration';
import { LetKeyword } from '../-private/keywords';

export default TestComponent;
export declare const globals: {
  let: LetKeyword;
  on: DirectInvokable<
    <T extends keyof HTMLElementEventMap>(
      args: EmptyObject,
      event: T,
      callback: (event: HTMLElementEventMap[T]) => void
    ) => BoundModifier<HTMLElement>
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
  [Element]: Get<T, 'Element', null>;
  [Context]: TemplateContext<this, Get<T, 'Args'>, Get<T, 'Yields'>, Get<T, 'Element', null>>;
}
