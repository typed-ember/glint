import { ModifierLike } from '@glint/template';
import { DirectInvokable, ModifierReturn, NamedArgs } from '@glint/template/-private/integration';

export interface OnModifierArgs {
  capture?: boolean;
  once?: boolean;
  passive?: boolean;
}

export type EventForName<Name extends string> = Name extends keyof HTMLElementEventMap
  ? HTMLElementEventMap[Name]
  : Event;

type OnModifierClass = abstract new <
  Name extends string,
  El extends Element = Element,
>() => InstanceType<
  ModifierLike<{
    Element: El;
    Args: {
      Named: OnModifierArgs;
      Positional: [
        name: Name,
        callback: (event: EventForName<Name> & { currentTarget: El }) => void,
      ];
    };
  }>
>;

// A direct call signature, so templates don't instantiate the modifier class
// for every element type and event name.
type OnModifierCall = DirectInvokable<
  <Name extends string, El extends Element>(
    element: El,
    name: Name,
    callback: (event: EventForName<Name> & { currentTarget: El }) => void,
    options?: NamedArgs<OnModifierArgs>,
  ) => ModifierReturn
>;

export interface OnModifier extends OnModifierClass, OnModifierCall {}
