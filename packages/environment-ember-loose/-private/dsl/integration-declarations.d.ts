import { Context, EmptyObject, TemplateContext } from '@glint/template/-private/integration';
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
