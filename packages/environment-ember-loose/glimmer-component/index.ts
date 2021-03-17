import type { ContextType, Invoke, TemplateContext } from '@glint/template/-private';
import type { RootElement } from '@glint/template/-private/attributes';
import type { AcceptsBlocks, EmptyObject } from '@glint/template/-private/signature';

const GlimmerComponent = window.require('@glimmer/component').default;
type GlimmerComponent<T> = import('@glimmer/component').default<T>;
type GlimmerComponentConstructor = typeof import('@glimmer/component').default;

type Get<T, Key, Otherwise = EmptyObject> = Key extends keyof T
  ? Exclude<T[Key], undefined>
  : Otherwise;

export interface ComponentSignature {
  Args?: Partial<Record<string, unknown>>;
  Yields?: Partial<Record<string, Array<unknown>>>;
  Element?: Element;
}

const Component = GlimmerComponent as new <T extends ComponentSignature = {}>(
  ...args: ConstructorParameters<GlimmerComponentConstructor>
) => Component<T>;

interface Component<T extends ComponentSignature = {}> extends GlimmerComponent<Get<T, 'Args'>> {
  [Invoke]: (args: Get<T, 'Args'>) => AcceptsBlocks<Get<T, 'Yields'>>;
  [RootElement]: Get<T, 'Element', null>;
  [ContextType]: TemplateContext<this, Get<T, 'Args'>, Get<T, 'Yields'>, Get<T, 'Element', null>>;
}

export default Component;
