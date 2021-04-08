import * as glimmerxComponent from '@glimmerx/component';

export * from '@glimmerx/component';

import type {
  AcceptsBlocks,
  Context,
  EmptyObject,
  Invoke,
  TemplateContext,
} from '@glint/template/-private/integration';

type Get<T, Key, Otherwise = EmptyObject> = Key extends keyof T
  ? Exclude<T[Key], undefined>
  : Otherwise;

export interface ComponentSignature {
  Args?: Partial<Record<string, unknown>>;
  Yields?: Partial<Record<string, Array<unknown>>>;
  Element?: Element;
}

const Component = glimmerxComponent.default as new <
  T extends ComponentSignature = {}
>() => Component<T>;
interface Component<T extends ComponentSignature = {}>
  extends glimmerxComponent.default<Get<T, 'Args'> & {}> {
  [Invoke]: (args: Get<T, 'Args'>) => AcceptsBlocks<Get<T, 'Yields'>, Get<T, 'Element', null>>;
  [Context]: TemplateContext<this, Get<T, 'Args'>, Get<T, 'Yields'>, Get<T, 'Element', null>>;
}

export default Component;
