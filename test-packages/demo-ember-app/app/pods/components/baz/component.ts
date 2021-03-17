import Component from '@glint/environment-ember-loose/glimmer-component';

export interface BazSignature {
  Args: { optional?: string };
}

export default class BazComponent extends Component<BazSignature> {
  name = 'BAZ';
}

declare module '@glint/environment-ember-loose/types/registry' {
  export default interface Registry {
    Baz: typeof BazComponent;
  }
}
