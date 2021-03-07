import '@glint/environment-ember-loose/types/registry';

declare module '@glint/environment-ember-loose/types/registry' {
  export default interface Registry {
    Foo: typeof import('demo-ember-app/components/foo').default;
    Bar: typeof import('demo-ember-app/components/bar').default;
    Baz: typeof import('demo-ember-app/pods/components/baz/component').default;
    Qux: typeof import('demo-ember-app/components/qux').default;
    EmberComponent: typeof import('demo-ember-app/components/ember').default;
  }
}
