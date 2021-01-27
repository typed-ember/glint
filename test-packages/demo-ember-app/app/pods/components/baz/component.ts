import Component from '@ember/component';

export default class BazComponent extends Component {
  name = 'BAZ';
}

declare module '@glint/environment-ember-loose/types/registry' {
  export default interface Registry {
    Baz: BazComponent;
  }
}
