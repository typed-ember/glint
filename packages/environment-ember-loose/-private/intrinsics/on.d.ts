import { ModifierReturn, DirectInvokable } from '@glint/template/-private/integration';

export interface OnModifierArgs {
  capture?: boolean;
  once?: boolean;
  passive?: boolean;
}

export type OnModifier = DirectInvokable<{
  // There may be a ver event types not covered in HTMLElementEventMap, but we'll just default to Event
  <Name extends keyof HTMLElementEventMap>(
    args: OnModifierArgs,
    name: Name,
    callback: (event: HTMLElementEventMap[Name]) => void
  ): ModifierReturn<Element>;
  (args: OnModifierArgs, name: string, callback: (event: Event) => void): ModifierReturn<Element>;
}>;
