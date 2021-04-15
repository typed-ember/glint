import { expectTypeOf } from 'expect-type';
import { AcceptsBlocks, DirectInvokable, TemplateContext } from '../-private/integration';
import {
  emitComponent,
  resolve,
  ResolveContext,
  resolveOrReturn,
  template,
  yieldToBlock,
} from '../-private/dsl';
import TestComponent, { globals } from './test-component';

declare function value<T>(): T;

// Component with a template
{
  interface MyArgs<T> {
    value: T;
  }

  interface MyYields<T> {
    body: [someFlag: boolean, someValue: T];
  }

  class MyComponent<T> extends TestComponent<{ Args: MyArgs<T>; Yields: MyYields<T> }> {
    private state = { ready: false };

    /**
     * ```hbs
     * {{#let this.state.ready as |isReady|}}
     *   {{yield isReady @value to="body"}}
     * {{/let}}
     * ```
     */
    public static template = template(function <T>(𝚪: ResolveContext<MyComponent<T>>) {
      {
        const component = emitComponent(resolve(globals.let)({}, 𝚪.this.state.ready));

        {
          const [isReady] = component.blockParams.default;
          yieldToBlock(𝚪, 'body', isReady, 𝚪.args.value);
        }
      }
    });
  }

  type ExpectedSignature = <T>(
    args: MyArgs<T>
  ) => AcceptsBlocks<{
    body: [boolean, T];
  }>;

  type ExpectedContext<T> = TemplateContext<MyComponent<T>, MyArgs<T>, MyYields<T>, null>;

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

  expectTypeOf(resolve(value<DirectInvokable<TestSignature>>())).toEqualTypeOf<TestSignature>();
}

// Values of type `any` or `never` (themselves typically the product of other type errors)
// shouldn't unnecessarily blow things up by producing an `unknown` signature.
{
  expectTypeOf(resolveOrReturn({} as any)).toEqualTypeOf<any>();
  expectTypeOf(resolveOrReturn({} as never)).toEqualTypeOf<never>();
  expectTypeOf(resolve({} as any)).toEqualTypeOf<any>();
  expectTypeOf(resolve({} as never)).toEqualTypeOf<never>();
}
