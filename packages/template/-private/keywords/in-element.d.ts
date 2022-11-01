import { ComponentReturn, DirectInvokable } from '../integration';

export type InElementKeyword = DirectInvokable<{
  (
    args: {
      insertBefore?: null | undefined;
    },
    element: ShadowRoot | Element
  ): ComponentReturn<{ default: [] }>;
}>;
