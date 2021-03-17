import { CreatesModifier } from '@glint/template/-private';
import { DirectInvokable } from '@glint/template/-private/resolution';

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
  ): CreatesModifier<HTMLElement>;
  (args: OnModifierArgs, name: string, callback: (event: Event) => void): CreatesModifier<
    HTMLElement
  >;
}>;
