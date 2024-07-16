/* eslint-disable ember/no-classic-components, ember/require-tagless-components */
import Component from '@ember/component';
import { ComponentLike } from '@glint/template';

export default class Foo extends Component {
  name = 'FOO';

  obj = { a: 'A', b: 'B', c: 1, __glintRef__: '' };

  MaybeComponent?: ComponentLike<{ Args: { arg: string } }>;
}

declare module '@glint/environment-ember-loose/registry' {
  export default interface Registry {
    Foo: typeof Foo;
  }
}
