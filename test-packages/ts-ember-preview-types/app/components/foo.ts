import Component from '@ember/component';
import { ComponentLike } from '@glint/template';

export default class Foo extends Component {
  name = 'FOO';

  obj = { a: 'A', b: 'B', c: 1, 𝚪: '' };

  MaybeComponent?: ComponentLike<{ Args: { arg: string } }>;
}

declare module '@glint/environment-ember-loose/registry' {
  export default interface Registry {
    Foo: typeof Foo;
  }
}
