/**
 * This module contains default resolution rules for working with
 * Ember and Glimmer components, as well as resolving the signatures
 * of anything declared with Glint's `Invokable` type.
 *
 * These resolution rules are designed to be extensible, to allow
 * for components/helpers/modifiers with custom base classes that
 * have their own managers and attendant semantics. Note that
 * in most cases (such as helpers and modifiers) that shouldn't be
 * necessary, as
 *
 * For more information, see the `ResolveContext` and `ResolveSignature`
 * types.
 *
 * At some point these things will likely need to be teased apart
 * into separate packages (or at least separate modules) to avoid
 * inflicting dependencies on `@ember/component` on packages only
 * using Glimmer components, and vice versa.
 */
declare const ModuleDocs: void;

import EmberComponent from '@ember/component';
import GlimmerComponent from '@glimmer/component';
import Helper from '@ember/component/helper';
import { TemplateContext } from '../template';
import { AcceptsBlocks, ReturnsValue } from '../signature';
import { BlockResult } from '../blocks';
import { Invokable } from '../invoke';
import { ResolutionKey } from '../../resolution-rules';

type Constructor<T> = new (...args: never[]) => T;

declare const ResolveGlimmerComponent: unique symbol;
declare const ResolveEmberComponent: unique symbol;
declare const ResolveEmberHelper: unique symbol;

declare module '@glimmer/component' {
  export default interface Component<Args> {
    [ResolutionKey]: typeof ResolveGlimmerComponent;
  }
}

declare module '@ember/component' {
  export default interface Component {
    [ResolutionKey]: typeof ResolveEmberComponent;
  }
}

declare module '@ember/component/helper' {
  export default interface Helper {
    [ResolutionKey]: typeof ResolveEmberHelper;
  }
}

declare module '@glint/template/resolution-rules' {
  export interface ContextResolutions<Host> {
    [ResolveGlimmerComponent]: Host extends GlimmerComponent<infer Args>
      ? TemplateContext<Host, Args>
      : never;

    [ResolveEmberComponent]: Host extends EmberComponent
      ? TemplateContext<Host, Record<string, unknown>>
      : never;
  }

  export interface SignatureResolutions<InvokedValue> {
    [ResolveGlimmerComponent]: InvokedValue extends Constructor<GlimmerComponent<infer Args>>
      ? InvokedValue extends { template: Invokable<infer Signature> }
        ? Signature
        : (args: Args) => AcceptsBlocks<{ default?(): BlockResult }>
      : never;

    [ResolveEmberHelper]: InvokedValue extends Constructor<Helper & { compute: infer Compute }>
      ? Compute extends (positional: infer Positional, named: infer Named) => infer Result
        ? (named: Named, ...positional: Positional & unknown[]) => ReturnsValue<Result>
        : never
      : never;

    // TODO: deal with positional params?
    [ResolveEmberComponent]: InvokedValue extends Constructor<EmberComponent & infer Instance>
      ? InvokedValue extends { template: Invokable<infer Signature> }
        ? Signature
        : (
            args: Partial<Instance>,
            ...positional: unknown[]
          ) => AcceptsBlocks<{ default?(): BlockResult }>
      : never;
  }
}
