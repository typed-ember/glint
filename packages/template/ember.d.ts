// Import this module to enable resolution rules for Ember components and helpers

import EmberComponent from '@ember/component';
import Helper from '@ember/component/helper';
import {
  ResolutionKey,
  TemplateContext,
  ReturnsValue,
  Invokable,
  AcceptsBlocks,
  BlockResult,
  NoNamedArgs,
} from '@glint/template/-private';

type Constructor<T> = new (...args: never[]) => T;

declare const ResolveEmberComponent: unique symbol;
declare const ResolveEmberHelper: unique symbol;

declare module '@ember/component' {
  export default interface Component {
    [ResolutionKey]: typeof ResolveEmberComponent;
  }
}

declare module '@ember/component/helper' {
  export default interface Helper {
    [ResolutionKey]: typeof ResolveEmberHelper;
  }

  export function helper<T, Positional extends unknown[], Args = NoNamedArgs>(
    f: (positional: Positional, named: Args) => T
  ): Invokable<(args: Args, ...positional: Positional) => ReturnsValue<T>>;
}

declare module '@glint/template/resolution-rules' {
  export interface ContextResolutions<Host> {
    [ResolveEmberComponent]: Host extends EmberComponent
      ? TemplateContext<Host, Record<string, unknown>>
      : never;
  }

  export interface SignatureResolutions<InvokedValue> {
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
