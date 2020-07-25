import '@glint/template/ember';
import '@glint/template/glimmer';

import GlimmerComponent from '@glimmer/component';
import EmberComponent from '@ember/component';
import { expectTypeOf } from 'expect-type';
import { ResolveSignature, resolveOrReturn } from '@glint/template/-private/resolution';
import { TemplateContext } from '@glint/template/-private/template';
import { template, invokeBlock, resolve, toBlock, ResolveContext } from '@glint/template';
import { Invokable } from '@glint/template/-private/invoke';
import { AcceptsBlocks } from '../-private';
import Globals from '../-private/globals';

declare function value<T>(): T;

// Glimmer component with no template
{
  type MyArgs<T> = {
    value: T;
  };

  class MyComponent<T> extends GlimmerComponent<MyArgs<T>> {}

  type ExpectedSignature = (args: MyArgs<unknown>) => AcceptsBlocks<{ default?: [] }>;

  // Resolved component signature is the expected one
  expectTypeOf<ResolveSignature<typeof MyComponent>>().toEqualTypeOf<ExpectedSignature>();
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
      yield invokeBlock(resolve(Globals['let'])({}, 𝚪.this.state.ready), {
        *default(isReady) {
          yield toBlock('body', isReady, 𝚪.args.value);
        },
      });
    });
  }

  type ExpectedSignature = <T>(
    args: MyArgs<T>
  ) => AcceptsBlocks<{
    body?: [boolean, T];
  }>;

  type ExpectedContext<T> = TemplateContext<MyComponent<T>, MyArgs<T>>;

  // Template has the correct type
  expectTypeOf(MyComponent.template).toEqualTypeOf<Invokable<ExpectedSignature>>();

  // Resolved component signature uses the template type
  expectTypeOf<ResolveSignature<typeof MyComponent>>().toEqualTypeOf<ExpectedSignature>();

  // Template context is inferred correctly
  expectTypeOf<ResolveContext<MyComponent<number>>>().toEqualTypeOf<ExpectedContext<number>>();
  expectTypeOf<ResolveContext<MyComponent<string>>>().toEqualTypeOf<ExpectedContext<string>>();
}

// Ember component with no template
{
  class MyComponent<T> extends EmberComponent {
    public value!: T;
  }

  type ExpectedSignature = (
    args: Partial<MyComponent<unknown>>,
    ...positional: unknown[]
  ) => AcceptsBlocks<{ default?: [] }>;

  // Resolved component signature is as expected
  expectTypeOf<ResolveSignature<typeof MyComponent>>().toEqualTypeOf<ExpectedSignature>();
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
      yield invokeBlock(resolve(Globals['let'])({}, 𝚪.this.value), {
        *default(thisValue) {
          yield toBlock('body', thisValue, 𝚪.args.value);
        },
      });
    });
  }

  type ExpectedSignature = <T>(
    args: Record<string, unknown>
  ) => AcceptsBlocks<{
    body?: [T, unknown];
  }>;

  type ExpectedContext<T> = TemplateContext<MyComponent<T>, Record<string, unknown>>;

  // Template has the correct type
  expectTypeOf(MyComponent.template).toEqualTypeOf<Invokable<ExpectedSignature>>();

  // Resolved component signature uses the template type
  expectTypeOf<ResolveSignature<typeof MyComponent>>().toEqualTypeOf<ExpectedSignature>();

  // Template context is inferred correctly
  expectTypeOf<ResolveContext<MyComponent<number>>>().toEqualTypeOf<ExpectedContext<number>>();
  expectTypeOf<ResolveContext<MyComponent<string>>>().toEqualTypeOf<ExpectedContext<string>>();
}

// A raw Invokable value
{
  type TestSignature = <T>(
    args: { value: T; values: T[] },
    positional: string
  ) => AcceptsBlocks<{
    foo: [T[], string];
    otherwise: [];
  }>;

  expectTypeOf(resolve(value<Invokable<TestSignature>>())).toEqualTypeOf<TestSignature>();
}

// Values of type `any` or `never` (themselves typically the product of other type errors)
// shouldn't unnecessarily blow things up by producing an `unknown` signature.
{
  expectTypeOf(resolveOrReturn({} as any)).toEqualTypeOf<any>();
  expectTypeOf(resolveOrReturn({} as never)).toEqualTypeOf<any>();
  expectTypeOf(resolve({} as any)).toEqualTypeOf<any>();
  expectTypeOf(resolve({} as never)).toEqualTypeOf<any>();
}
