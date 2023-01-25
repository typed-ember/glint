// This module is responsible for augmenting the upstream definitions of entities that interact
// with templates to include the information necessary for Glint to typecheck them.
import { ComponentLike, HelperLike, ModifierLike } from '@glint/template';
import {
  Context,
  FlattenBlockParams,
  HasContext,
  TemplateContext,
} from '@glint/template/-private/integration';
import {
  ComponentSignatureArgs,
  ComponentSignatureBlocks,
  ComponentSignatureElement,
} from '@glint/template/-private/signature';

//////////////////////////////////////////////////////////////////////
// Components

import '@ember/component';
import '@ember/component/template-only';
import '@glimmer/component';

type ComponentContext<This, S> = TemplateContext<
  This,
  ComponentSignatureArgs<S>['Named'],
  FlattenBlockParams<ComponentSignatureBlocks<S>>,
  ComponentSignatureElement<S>
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
  [Context]: ComponentContext<null, S>;
}

// As with other abstract constructor types, this allows us to provide a class
// and therefore have InstanceType work as needed, while forbidding construction
// by end users.
type TemplateOnlyConstructor<S> = abstract new () => TemplateOnlyComponentInstance<S>;

declare module '@ember/component/template-only' {
  export interface TemplateOnlyComponent<S> extends TemplateOnlyConstructor<S> {}
}

//////////////////////////////////////////////////////////////////////
// Helpers

import '@ember/component/helper';

declare module '@ember/component/helper' {
  export default interface Helper<S> extends InstanceType<HelperLike<S>> {}
}

//////////////////////////////////////////////////////////////////////
// Modifiers

import 'ember-modifier';

declare module 'ember-modifier' {
  export default interface ClassBasedModifier<S> extends InstanceType<ModifierLike<S>> {}
}

//////////////////////////////////////////////////////////////////////
// Routes and Controllers

import Controller from '@ember/controller';
import Route from '@ember/routing/route';

type ModelForRoute<T extends Route> = Awaited<ReturnType<T['model']>>;
type ModelField<T> = { model: T };

declare module '@ember/routing/route' {
  export default interface Route {
    [Context]: TemplateContext<
      Controller & ModelField<ModelForRoute<this>>,
      ModelField<ModelForRoute<this>>,
      {},
      null
    >;
  }
}

declare module '@ember/controller' {
  export default interface Controller {
    [Context]: TemplateContext<this, ModelField<this['model']>, {}, null>;
  }
}

//////////////////////////////////////////////////////////////////////
// Rendering Tests

import '@ember/test-helpers';
import 'ember-cli-htmlbars';

type TestTemplate<T> = abstract new () => HasContext<TemplateContext<T, {}, {}, void>>;

declare module '@ember/test-helpers' {
  export function render<T>(template: TestTemplate<T>): Promise<void>;
}

// Declaring that `TemplateFactory` is a valid `TestTemplate` prevents vanilla `tsc` from freaking out
// about `hbs` not returning a valid type for `render`. Glint itself will never see `hbs` get used, as
// it's transformed to the template DSL before typechecking.
declare module 'ember-cli-htmlbars' {
  interface TemplateFactory extends TestTemplate<any> {}
}
