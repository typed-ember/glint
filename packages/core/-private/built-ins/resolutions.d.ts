/**
 * This module contains default resolution rules for working with
 * Ember and Glimmer components, as well as resolving the signatures
 * of anything declared with Gleam's `Invokable` type.
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

type Constructor<T> = new (...args: never[]) => T;

declare module '@gleam/core/-private/resolution' {
  export interface ContextResolutions<Host> {
    '@glimmer/component': Host extends GlimmerComponent<infer Args>
      ? TemplateContext<Host, Args>
      : Unmatched;
    '@ember/component': Host extends EmberComponent
      ? TemplateContext<Host, Record<string, unknown>>
      : Unmatched;
  }

  export interface SignatureResolutions<InvokedValue> {
    '@gleam/core': InvokedValue extends Invokable<infer Signature> ? Signature : Unmatched;

    '@glimmer/component': InvokedValue extends Constructor<GlimmerComponent<infer Args>>
      ? InvokedValue extends { template: Invokable<infer Signature> }
        ? Signature
        : (args: Args) => AcceptsBlocks<{ default?(): BlockResult }>
      : Unmatched;

    '@ember/component/helper': InvokedValue extends Constructor<Helper & { compute: infer Compute }>
      ? Compute extends (positional: infer Positional, named: infer Named) => infer Result
        ? (named: Named, ...positional: Positional & unknown[]) => ReturnsValue<Result>
        : Unmatched
      : Unmatched;

    // TODO: deal with positional params?
    '@ember/component': InvokedValue extends Constructor<EmberComponent & infer Instance>
      ? InvokedValue extends { template: Invokable<infer Signature> }
        ? Signature
        : (
            args: Partial<Instance>,
            ...positional: unknown[]
          ) => AcceptsBlocks<{ default?(): BlockResult }>
      : Unmatched;
  }
}
