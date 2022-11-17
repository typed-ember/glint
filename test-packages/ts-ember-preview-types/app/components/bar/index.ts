// eslint-disable-next-line ember/no-classic-components
import Component from '@ember/component';

export interface BarSignature {
  Args: {
    grault: number;
  };
}

// eslint-disable-next-line ember/require-tagless-components
export default class Bar extends Component<BarSignature> {
  name = 'BAR';
}

declare module '@glint/environment-ember-loose/registry' {
  export default interface Registry {
    Bar: typeof Bar;
  }
}
