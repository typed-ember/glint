import {
  Context,
  EmptyObject,
  HasContext,
  TemplateContext,
} from '@glint/template/-private/integration';
import Route from '@ember/routing/route';
import Controller from '@ember/controller';

type Awaited<T> = T extends PromiseLike<infer U> ? U : T;
type ModelForRoute<T extends Route> = Awaited<ReturnType<T['model']>>;
type ModelField<T> = { model: T };

declare module '@ember/routing/route' {
  export default interface Route {
    [Context]: TemplateContext<
      Controller & ModelField<ModelForRoute<this>>,
      ModelField<ModelForRoute<this>>,
      EmptyObject,
      null
    >;
  }
}

declare module '@ember/controller' {
  export default interface Controller {
    [Context]: TemplateContext<this, ModelField<this['model']>, EmptyObject, null>;
  }
}

type TestTemplate<T> = new () => HasContext<TemplateContext<T, EmptyObject, EmptyObject, null>>;

declare module '@ember/test-helpers' {
  export function render<T>(template: TestTemplate<T>): Promise<void>;
}

// Declaring that `TemplateFactory` is a valid `TestTemplate` prevents vanilla `tsc` from freaking out
// about `hbs` not returning a valid type for `render`. Glint itself will never see `hbs` get used, as
// it's transformed to the template DSL before typechecking.
declare module 'ember-cli-htmlbars' {
  interface TemplateFactory extends TestTemplate<any> {}
}
