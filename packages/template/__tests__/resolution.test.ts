import { expectTypeOf } from 'expect-type';
import { ResolveSignature, resolveOrReturn } from '@glint/template/-private/resolution';
import { TemplateContext } from '@glint/template/-private/template';
import { template, invokeBlock, resolve, toBlock, ResolveContext } from '@glint/template';
import { AcceptsBlocks } from '../-private';
import TestComponent, { globals } from './test-component';

declare function value<T>(): T;

// Component with no template
{
  type MyArgs<T> = {
    value: T;
  };

  class MyComponent<T> extends TestComponent<MyArgs<T>> {}

  type ExpectedSignature = (args: MyArgs<unknown>) => AcceptsBlocks<{ default?: [] }>;

  // Resolved component signature is the expected one
  expectTypeOf<ResolveSignature<typeof MyComponent>>().toEqualTypeOf<ExpectedSignature>();
}

// Component with a template
{
  type MyArgs<T> = {
    value: T;
  };

  class MyComponent<T> extends TestComponent<MyArgs<T>> {
    private state = { ready: false };

    /**
     * ```hbs
     * {{#let this.state.ready as |isReady|}}
     *   {{yield isReady @value to="body"}}
     * {{/let}}
     * ```
     */
    public static template = template(function* <T>(𝚪: ResolveContext<MyComponent<T>>) {
      yield invokeBlock(resolve(globals.let)({}, 𝚪.this.state.ready), {
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
  expectTypeOf(MyComponent.template).toEqualTypeOf<ExpectedSignature>();

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

  expectTypeOf(resolve(value<TestSignature>())).toEqualTypeOf<TestSignature>();
}

// Values of type `any` or `never` (themselves typically the product of other type errors)
// shouldn't unnecessarily blow things up by producing an `unknown` signature.
{
  expectTypeOf(resolveOrReturn({} as any)).toEqualTypeOf<any>();
  expectTypeOf(resolveOrReturn({} as never)).toEqualTypeOf<any>();
  expectTypeOf(resolve({} as any)).toEqualTypeOf<any>();
  expectTypeOf(resolve({} as never)).toEqualTypeOf<any>();
}
