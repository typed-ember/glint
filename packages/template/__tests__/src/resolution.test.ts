import '@glint/template/ember';
import '@glint/template/glimmer';

import GlimmerComponent from '@glimmer/component';
import EmberComponent from '@ember/component';
import { expectType } from 'tsd';
import { AcceptsBlocks } from '@glint/template/-private/signature';
import { BlockResult } from '@glint/template/-private/blocks';
import { ResolveSignature, resolveOrReturn } from '@glint/template/-private/resolution';
import { TemplateContext } from '@glint/template/-private/template';
import { template, invokeBlock, resolve, BuiltIns, toBlock, ResolveContext } from '@glint/template';
import { Invokable } from '@glint/template/-private/invoke';

declare function value<T>(): T;

// Glimmer component with no template
{
  type MyArgs<T> = {
    value: T;
  };

  class MyComponent<T> extends GlimmerComponent<MyArgs<T>> {}

  type ExpectedSignature = (args: MyArgs<unknown>) => AcceptsBlocks<{ default?(): BlockResult }>;

  // Resolved component signature is the expected one
  expectType<ExpectedSignature>(value<ResolveSignature<typeof MyComponent>>());
}

// Glimmer component with a template
{
  type MyArgs<T> = {
    value: T;
  };

  class MyComponent<T> extends GlimmerComponent<MyArgs<T>> {
    private state = { ready: false };

    /**
     * ```hbs
     * {{#let this.state.ready as |isReady|}}
     *   {{yield isReady @value to="body"}}
     * {{/let}}
     * ```
     */
    public static template = template(function* <T>(𝚪: ResolveContext<MyComponent<T>>) {
      yield invokeBlock(resolve(BuiltIns['let'])({}, 𝚪.this.state.ready), {
        *default(isReady) {
          yield toBlock('body', isReady, 𝚪.args.value);
        },
      });
    });
  }

  type ExpectedSignature = <T>(
    args: MyArgs<T>
  ) => AcceptsBlocks<{
    body?(isReady: boolean, value: T): BlockResult;
  }>;

  type ExpectedContext<T> = TemplateContext<MyComponent<T>, MyArgs<T>>;

  // Template has the correct type
  expectType<Invokable<ExpectedSignature>>(MyComponent.template);

  // Resolved component signature uses the template type
  expectType<ExpectedSignature>(value<ResolveSignature<typeof MyComponent>>());

  // Template context is inferred correctly
  expectType<ExpectedContext<number>>(value<ResolveContext<MyComponent<number>>>());
  expectType<ExpectedContext<string>>(value<ResolveContext<MyComponent<string>>>());
}

// Ember component with no template
{
  class MyComponent<T> extends EmberComponent {
    public value!: T;
  }

  type ExpectedSignature = (
    args: Partial<MyComponent<unknown>>,
    ...positional: unknown[]
  ) => AcceptsBlocks<{ default?(): BlockResult }>;

  // Resolved component signature is as expected
  expectType<ExpectedSignature>(value<ResolveSignature<typeof MyComponent>>());
}

// Ember component with a template
{
  class MyComponent<T> extends EmberComponent {
    public value!: T;

    /**
     * ```hbs
     * {{#let this.state.ready as |isReady|}}
     *   {{yield isReady @value to="body"}}
     * {{/let}}
     * ```
     */
    public static template = template(function* <T>(𝚪: ResolveContext<MyComponent<T>>) {
      yield invokeBlock(resolve(BuiltIns['let'])({}, 𝚪.this.value), {
        *default(thisValue) {
          yield toBlock('body', thisValue, 𝚪.args.value);
        },
      });
    });
  }

  type ExpectedSignature = <T>(
    args: Record<string, unknown>
  ) => AcceptsBlocks<{
    body?: (thisValue: T, argValue: unknown) => BlockResult;
  }>;

  type ExpectedContext<T> = TemplateContext<MyComponent<T>, Record<string, unknown>>;

  // Template has the correct type
  expectType<Invokable<ExpectedSignature>>(MyComponent.template);

  // Resolved component signature uses the template type
  expectType<ExpectedSignature>(value<ResolveSignature<typeof MyComponent>>());

  // Template context is inferred correctly
  expectType<ExpectedContext<number>>(value<ResolveContext<MyComponent<number>>>());
  expectType<ExpectedContext<string>>(value<ResolveContext<MyComponent<string>>>());
}

// A raw Invokable value
{
  type TestSignature = <T>(
    args: { value: T; values: T[] },
    positional: string
  ) => AcceptsBlocks<{
    foo(values: T[], mode: string): BlockResult;
    otherwise(): BlockResult;
  }>;

  expectType<TestSignature>(resolve(value<Invokable<TestSignature>>()));
}

// Values of type `any` or `never` (themselves typically the product of other type errors)
// shouldn't unnecessarily blow things up by producing an `unknown` signature.
{
  expectType<any>(resolveOrReturn({} as any));
  expectType<any>(resolveOrReturn({} as never));
  expectType<any>(resolve({} as any));
  expectType<any>(resolve({} as never));
}
