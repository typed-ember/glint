import Component from '@glint/environment-ember-loose/glimmer-component';

export default class Qux extends Component {
  name = 'QUX';
}

declare module '@glint/environment-ember-loose/registry' {
  export default interface Registry {
    Qux: typeof Qux;
  }
}
