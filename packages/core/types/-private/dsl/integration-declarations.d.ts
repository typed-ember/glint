// This module is responsible for augmenting the upstream definitions of entities that interact
// with templates to include the information necessary for Glint to typecheck them.

import type { ComponentLike, HelperLike, ModifierLike } from '@glint/template';
import type {
  Context,
  FlattenBlockParams,
  HasContext,
  TemplateContext,
} from '@glint/template/-private/integration';
import type {
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

import type { InputComponent as ImportedInputComponent } from '../intrinsics/input';
import type { TextareaComponent as ImportedTextareaComponent } from '../intrinsics/textarea';
declare module '@ember/component' {
  export default interface Component<S> extends InstanceType<ComponentLike<S>> {
    [Context]: ComponentContext<this, S>;
  }
  export interface Textarea extends ImportedTextareaComponent {}
  export interface Input extends ImportedInputComponent {}
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

import type Controller from '@ember/controller';
import type Route from '@ember/routing/route';

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

import type { LinkToComponent } from '../intrinsics/link-to';
declare module '@ember/routing' {
  export interface LinkTo extends LinkToComponent {}
}

//////////////////////////////////////////////////////////////////////
// Rendering Tests

import '@ember/test-helpers';

type TestTemplate<T> = abstract new () => HasContext<TemplateContext<T, {}, {}, void>>;

declare module '@ember/test-helpers' {
  export function render<T>(template: TestTemplate<T>): Promise<void>;
}

import '@ember/modifier';
import type { OnModifier as ImportedOnModifier } from '../intrinsics/on';
declare module '@ember/modifier' {
  export interface OnModifier extends ImportedOnModifier {}
}

import '@ember/helper';
import type { ConcatHelper as ImportedConcatHelper } from '../intrinsics/concat';
import type { FnHelper as ImportedFnHelper } from '../intrinsics/fn';
import type { GetHelper as ImportedGetHelper } from '../intrinsics/get';

declare module '@ember/helper' {
  export interface ConcatHelper extends ImportedConcatHelper {}
  export interface FnHelper extends ImportedFnHelper {}
  export interface GetHelper extends ImportedGetHelper {}
}
