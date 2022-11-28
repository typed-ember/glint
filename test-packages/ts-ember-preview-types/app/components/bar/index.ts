import Component from '@ember/component';

export interface BarSignature {
  Args: {
    grault: number;
  };
}

export default class Bar extends Component<BarSignature> {
  name = 'BAR';
}

declare module '@glint/environment-ember-loose/registry' {
  export default interface Registry {
    Bar: typeof Bar;
  }
}
