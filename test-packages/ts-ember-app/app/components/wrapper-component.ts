import { ComponentLike, ComponentWithBoundArgs } from '@glint/environment-ember-loose';
import Component from '@glint/environment-ember-loose/glimmer-component';
import EmberComponent from './ember-component';

interface WrapperComponentSignature {
  Element: HTMLDivElement;
  Args: {
    value: string;
  };
  Yields: {
    default: [
      {
        InnerComponent: ComponentWithBoundArgs<typeof EmberComponent, 'required'>;
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
