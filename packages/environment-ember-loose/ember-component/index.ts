import type {
  Context,
  Invoke,
  TemplateContext,
  AcceptsBlocks,
  EmptyObject,
} from '@glint/template/-private/integration';

import type { AsObjectType } from '../-private/utilities';
import type { ComponentSignature } from '../-private';

export type { ComponentSignature };

declare const Ember: { Component: EmberComponentConstructor };

const EmberComponent = Ember.Component;
type EmberComponent = import('@ember/component').default;
type EmberComponentConstructor = typeof import('@ember/component').default;

type Get<T, Key, Otherwise = EmptyObject> = Key extends keyof T
  ? Exclude<T[Key], undefined>
  : Otherwise;

export type ArgsFor<T extends ComponentSignature> = 'Args' extends keyof T ? T['Args'] : {};

const Component = EmberComponent as AsObjectType<typeof EmberComponent> &
  (new <T extends ComponentSignature = {}>(
    ...args: ConstructorParameters<EmberComponentConstructor>
  ) => Component<T>);

interface Component<T extends ComponentSignature = {}> extends EmberComponent {
  [Invoke]: (args: Get<T, 'Args'>) => AcceptsBlocks<Get<T, 'Yields'>, Get<T, 'Element', null>>;
  [Context]: TemplateContext<this, Get<T, 'Args'>, Get<T, 'Yields'>, Get<T, 'Element', null>>;
}

export default Component;
