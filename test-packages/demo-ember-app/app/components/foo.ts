import Component from '@glimmer/component';

export default class FooComponent extends Component {
  name = 'FOO';

  obj = { a: 'A', b: 'B', c: 1, 𝚪: '' };
}

declare module '@glint/environment-ember-loose/types/registry' {
  export default interface Registry {
    Foo: FooComponent;
  }
}
