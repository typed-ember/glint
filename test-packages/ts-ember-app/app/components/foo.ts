/* eslint-disable ember/no-classic-components, ember/require-tagless-components */
import Component from '@ember/component';

export default class Foo extends Component {
  private name = 'FOO';

  private obj = { a: 'A', b: 'B', c: 1, 𝚪: '' };
}

declare module '@glint/environment-ember-loose/registry' {
  export default interface Registry {
    Foo: typeof Foo;
  }
}
