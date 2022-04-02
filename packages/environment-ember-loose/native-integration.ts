// This module is responsible for augmenting the upstream definitions of what a component,
// helper, or modifier is to include the information necessary for Glint to typecheck them.

// Import all the modules we're augmenting to make sure we don't short-circuit resolution
// and make ONLY our augmentations resolve.
import '@ember/component';
import '@ember/component/template-only';
import '@ember/component/helper';
import '@glimmer/component';
import 'ember-modifier/-private/class/modifier';

// Grab signature utilities for each entity type from their respective locations.
import * as C from '@glimmer/component/dist/types/addon/-private/component';
import * as H from '@ember/component/helper';
import * as M from 'ember-modifier/-private/signature';

import {
  Invoke,
  Context,
  TemplateContext,
  AcceptsBlocks,
  BoundModifier,
  FlattenBlockParams,
} from '@glint/template/-private/integration';

type EnsureSpreadable<T, Otherwise = []> = T extends Array<unknown> ? T : Otherwise;
type EnsureElement<T, Otherwise = null> = T extends Element ? T : Otherwise;

declare module '@ember/component' {
  export default interface Component<S> {
    [Invoke]: (
      named: C.ExpandSignature<S>['Args']['Named'],
      ...positional: C.ExpandSignature<S>['Args']['Positional']
    ) => AcceptsBlocks<
      FlattenBlockParams<C.ExpandSignature<S>['Blocks']>,
      EnsureElement<C.ExpandSignature<S>['Element']>
    >;

    [Context]: TemplateContext<
      this,
      C.ExpandSignature<S>['Args']['Named'],
      FlattenBlockParams<C.ExpandSignature<S>['Blocks']>,
      C.ExpandSignature<S>['Element']
    >;
  }
}

declare module '@ember/component/template-only' {
  export interface TemplateOnlyComponent<S> {
    new (...args: [never]): {
      [Invoke]: (
        named: C.ExpandSignature<S>['Args']['Named'],
        ...positional: C.ExpandSignature<S>['Args']['Positional']
      ) => AcceptsBlocks<
        FlattenBlockParams<C.ExpandSignature<S>['Blocks']>,
        EnsureElement<C.ExpandSignature<S>['Element']>
      >;

      [Context]: TemplateContext<
        void,
        C.ExpandSignature<S>['Args']['Named'],
        FlattenBlockParams<C.ExpandSignature<S>['Blocks']>,
        C.ExpandSignature<S>['Element']
      >;
    };
  }
}

declare module '@ember/component/helper' {
  export default interface Helper<S> {
    [Invoke]: (
      named: H.ExpandSignature<S>['Args']['Named'],
      ...positional: EnsureSpreadable<H.ExpandSignature<S>['Args']['Positional']>
    ) => H.ExpandSignature<S>['Return'];
  }
}

declare module '@glimmer/component' {
  export default interface Component<S> {
    [Invoke]: (
      named: C.ExpandSignature<S>['Args']['Named'],
      ...positional: C.ExpandSignature<S>['Args']['Positional']
    ) => AcceptsBlocks<
      FlattenBlockParams<C.ExpandSignature<S>['Blocks']>,
      EnsureElement<C.ExpandSignature<S>['Element']>
    >;

    [Context]: TemplateContext<
      this,
      C.ExpandSignature<S>['Args']['Named'],
      FlattenBlockParams<C.ExpandSignature<S>['Blocks']>,
      C.ExpandSignature<S>['Element']
    >;
  }
}

declare module 'ember-modifier/-private/class/modifier' {
  export default interface ClassBasedModifier<S> {
    [Invoke]: (
      named: M.NamedArgs<S>,
      ...positional: EnsureSpreadable<M.PositionalArgs<S>>
    ) => BoundModifier<EnsureElement<M.ElementFor<S>, never>>;
  }
}
