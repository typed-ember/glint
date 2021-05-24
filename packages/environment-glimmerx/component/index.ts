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

declare const GivenSignature: unique symbol;

export interface ComponentSignature {
  Args?: object;
  Yields?: object;
  Element?: Element;
}

export type TC<T extends ComponentSignature = {}> = TemplateComponent<T>;
export type TemplateComponent<T extends ComponentSignature = {}> = new () => {
  [Invoke]: (args: Get<T, 'Args'>) => AcceptsBlocks<Get<T, 'Yields'>, Get<T, 'Element', null>>;
  [Context]: TemplateContext<null, Get<T, 'Args'>, Get<T, 'Yields'>, Get<T, 'Element', null>>;
};

const Component = glimmerxComponent.default as new <
  T extends ComponentSignature = {}
>() => Component<T>;
interface Component<T extends ComponentSignature = {}>
  extends glimmerxComponent.default<Get<T, 'Args'> & {}> {
  // Allows `extends Component<infer Signature>` clauses to work as expected
  [GivenSignature]: T;

  [Invoke]: (args: Get<T, 'Args'>) => AcceptsBlocks<Get<T, 'Yields'>, Get<T, 'Element', null>>;
  [Context]: TemplateContext<this, Get<T, 'Args'>, Get<T, 'Yields'>, Get<T, 'Element', null>>;
}

export default Component;
