import Component from '@ember/component';

export default class QuxComponent extends Component {
  name = 'QUX';
}

declare module '@glint/environment-ember-loose/types/registry' {
  export default interface Registry {
    Qux: QuxComponent;
  }
}
