/* eslint-disable ember/no-classic-components, ember/require-tagless-components */
import { ComponentLike, WithBoundArgs } from '@glint/template';
import Component from '@ember/component';
import EmberComponent from './ember-component';

interface WrapperComponentSignature {
  Element: HTMLDivElement;
  Args: {
    value: string;
  };
  Blocks: {
    default: [
      {
        InnerComponent: WithBoundArgs<typeof EmberComponent, 'required'>;
        MaybeComponent?: ComponentLike<{ Args: { key: string } }>;
        stringValue?: string;
      }
    ];
  };
}

export default class WrapperComponent extends Component<WrapperComponentSignature> {}

declare module '@glint/environment-ember-loose/registry' {
  export default interface Registry {
    WrapperComponent: typeof WrapperComponent;
  }
}
