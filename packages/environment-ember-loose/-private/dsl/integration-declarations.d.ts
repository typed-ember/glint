// This module is responsible for augmenting the upstream definitions of entities that interact
// with templates to include the information necessary for Glint to typecheck them.
import { ComponentLike, HelperLike, ModifierLike } from '@glint/template';
import {
  Context,
  EmptyObject,
  HasContext,
  TemplateContext,
  FlattenBlockParams,
} from '@glint/template/-private/integration';

//////////////////////////////////////////////////////////////////////
// Components

import '@glimmer/component';
import '@ember/component';
import '@ember/component/template-only';

import { ExpandSignature } from '@glimmer/component/-private/component';

type ComponentContext<This, S> = TemplateContext<
  This,
  ExpandSignature<S>['Args']['Named'],
  FlattenBlockParams<ExpandSignature<S>['Blocks']>,
  ExpandSignature<S>['Element']
>;

declare module '@glimmer/component' {
  export default interface Component<S> extends InstanceType<ComponentLike<S>> {
    [Context]: ComponentContext<this, S>;
  }
}

declare module '@ember/component' {
  export default interface Component<S> extends InstanceType<ComponentLike<S>> {
    [Context]: ComponentContext<this, S>;
  }
}

interface TemplateOnlyComponentInstance<S> extends InstanceType<ComponentLike<S>> {
  [Context]: ComponentContext<void, S>;
}

declare module '@ember/component/template-only' {
  export interface TemplateOnlyComponent<S> {
    new (...args: [never]): TemplateOnlyComponentInstance<S>;
  }
}

//////////////////////////////////////////////////////////////////////
// Helpers

import '@ember/component/helper';

declare module '@ember/component/helper' {
  export default interface Helper<S> extends InstanceType<HelperLike<S>> {}
}

//////////////////////////////////////////////////////////////////////
// Modifiers

import 'ember-modifier/-private/class/modifier';

declare module 'ember-modifier/-private/class/modifier' {
  export default interface ClassBasedModifier<S> extends InstanceType<ModifierLike<S>> {}
}

//////////////////////////////////////////////////////////////////////
// Routes and Controllers

import Route from '@ember/routing/route';
import Controller from '@ember/controller';

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

//////////////////////////////////////////////////////////////////////
// Rendering Tests

import '@ember/test-helpers';
import 'ember-cli-htmlbars';

type TestTemplate<T> = abstract new () => HasContext<
  TemplateContext<T, EmptyObject, EmptyObject, null>
>;

declare module '@ember/test-helpers' {
  export function render<T>(template: TestTemplate<T>): Promise<void>;
}

// Declaring that `TemplateFactory` is a valid `TestTemplate` prevents vanilla `tsc` from freaking out
// about `hbs` not returning a valid type for `render`. Glint itself will never see `hbs` get used, as
// it's transformed to the template DSL before typechecking.
declare module 'ember-cli-htmlbars' {
  interface TemplateFactory extends TestTemplate<any> {}
}
