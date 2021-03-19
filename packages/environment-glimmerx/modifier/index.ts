import * as glimmerxModifier from '@glimmerx/modifier';

export * from '@glimmerx/modifier';

import type {
  BoundModifier,
  DirectInvokable,
  EmptyObject,
} from '@glint/template/-private/integration';

type OnModifier = DirectInvokable<
  <Name extends keyof HTMLElementEventMap>(
    args: EmptyObject,
    name: Name,
    callback: (event: HTMLElementEventMap[Name]) => void
  ) => BoundModifier<HTMLElement>
>;

export const on = (glimmerxModifier.on as unknown) as OnModifier;
