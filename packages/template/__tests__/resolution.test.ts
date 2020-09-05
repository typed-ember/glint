import { expectTypeOf } from 'expect-type';
import { resolveOrReturn } from '@glint/template/-private/resolution';
import { TemplateContext } from '@glint/template/-private/template';
import { template, invokeBlock, resolve, ResolveContext } from '@glint/template';
import { AcceptsBlocks } from '../-private';
import TestComponent, { globals } from './test-component';
import { yieldToBlock } from '../-private/blocks';

declare function value<T>(): T;

// Component with a template
{
  type MyArgs<T> = {
    value: T;
  };

  type MyYields<T> = {
    body: [boolean, T];
  };

  class MyComponent<T> extends TestComponent<MyArgs<T>, MyYields<T>> {
    private state = { ready: false };

    /**
     * ```hbs
     * {{#let this.state.ready as |isReady|}}
     *   {{yield isReady @value to="body"}}
     * {{/let}}
     * ```
     */
    public static template = template(function <T>(𝚪: ResolveContext<MyComponent<T>>) {
      invokeBlock(resolve(globals.let)({}, 𝚪.this.state.ready), {
        default(isReady) {
          yieldToBlock(𝚪, 'body', isReady, 𝚪.args.value);
        },
      });
    });
  }

  type ExpectedSignature = <T>(
    args: MyArgs<T>
  ) => AcceptsBlocks<{
    body: [boolean, T];
  }>;

  type ExpectedContext<T> = TemplateContext<MyComponent<T>, MyArgs<T>, MyYields<T>>;

  // Template has the correct type
  expectTypeOf(resolve(MyComponent)).toEqualTypeOf<ExpectedSignature>();

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
