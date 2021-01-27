import Component from '@glimmer/component';

interface BarComponentArgs {
  grault: number;
}

export default class BarComponent extends Component<BarComponentArgs> {
  name = 'BAR';
}

declare module '@glint/environment-ember-loose/types/registry' {
  export default interface Registry {
    Bar: BarComponent;
  }
}
