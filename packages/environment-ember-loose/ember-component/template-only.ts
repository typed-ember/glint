import { Ember } from './-ember';
import type {
  EmptyObject,
  TemplateContext,
  Context,
  AcceptsBlocks,
  InvokeDirect,
} from '@glint/template/-private/integration';
import type { ComponentSignature } from '../-private/utilities';

type TemplateOnlyComponentFactory = <T extends ComponentSignature = {}>(
  moduleName?: string
) => TemplateOnlyComponent<T>;

type Get<T, Key, Otherwise = EmptyObject> = Key extends keyof T
  ? Exclude<T[Key], undefined>
  : Otherwise;

export type TemplateOnlyComponent<T extends ComponentSignature = {}> = {
  [Context]: TemplateContext<void, Get<T, 'Args'>, Get<T, 'Yields'>, Get<T, 'Element', null>>;
  [InvokeDirect]: (
    args: Get<T, 'Args'>
  ) => AcceptsBlocks<Get<T, 'Yields'>, Get<T, 'Element', null>>;
};

const templateOnly: TemplateOnlyComponentFactory = Ember._templateOnlyComponent;

export default templateOnly;
