import { BoundModifier, DirectInvokable } from '@glint/template/-private/integration';

export interface OnModifierArgs {
  capture?: boolean;
  once?: boolean;
  passive?: boolean;
}

export type OnModifier = DirectInvokable<{
  <Name extends keyof HTMLElementEventMap>(
    args: OnModifierArgs,
    name: Name,
    callback: (event: HTMLElementEventMap[Name]) => void
  ): BoundModifier<HTMLElement>;
  (
    args: OnModifierArgs,
    name: string,
    callback: (event: Event) => void
  ): BoundModifier<HTMLElement>;
}>;
