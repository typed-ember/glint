import { ModifierLike } from '@glint/template';

export interface OnModifierArgs {
  capture?: boolean;
  once?: boolean;
  passive?: boolean;
}

export type EventForName<Name extends string> = Name extends keyof HTMLElementEventMap
  ? HTMLElementEventMap[Name]
  : Event;

export type OnModifier = abstract new <Name extends string>() => InstanceType<
  ModifierLike<{
    Element: Element;
    Args: {
      Named: OnModifierArgs;
      Positional: [name: Name, callback: (event: EventForName<Name>) => void];
    };
  }>
>;
