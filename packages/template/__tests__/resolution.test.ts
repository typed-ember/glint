import { expectTypeOf } from 'expect-type';
import {
  emitComponent,
  resolve,
  resolveOrReturn,
  templateForBackingValue,
  yieldToBlock,
} from '../-private/dsl';
import {
  ComponentReturn,
  DirectInvokable,
  NamedArgs,
  TemplateContext,
} from '../-private/integration';
import { ComponentLike } from '../-private/index';
import TestComponent, { globals } from './test-component';

declare function value<T>(): T;

// Component with a template
{
  interface MyArgs<T> {
    value: T;
  }

  interface MyBlocks<T> {
    body: [someFlag: boolean, someValue: T];
  }

  class MyComponent<T> extends TestComponent<{ Args: MyArgs<T>; Blocks: MyBlocks<T> }> {
    private state = { ready: false };

    /**
     * ```hbs
     * {{#let this.state.ready as |isReady|}}
     *   {{yield isReady @value to="body"}}
     * {{/let}}
     * ```
     */
    static {
      templateForBackingValue(this, function (__glintRef__) {
        {
          const component = emitComponent(resolve(globals.let)(__glintRef__.this.state.ready));

          {
            const [isReady] = component.blockParams.default;
            yieldToBlock(__glintRef__, 'body')(isReady, __glintRef__.args.value);
          }
        }
      });
    }
  }

  type ExpectedSignature = <T>(args: NamedArgs<MyArgs<T>>) => ComponentReturn<
    {
      body: [boolean, T];
    },
    unknown
  >;

  type ExpectedContext<T> = TemplateContext<MyComponent<T>, MyArgs<T>, MyBlocks<T>, null>;

  // Template has the correct type
  const myComponentSignature: ExpectedSignature = resolve(MyComponent);
  expectTypeOf(myComponentSignature).toEqualTypeOf<ExpectedSignature>();

  // Template context is inferred correctly
  templateForBackingValue(MyComponent<number>, function (context) {
    expectTypeOf(context).toEqualTypeOf<ExpectedContext<number>>();
  });

  templateForBackingValue(MyComponent<string>, function (context) {
    expectTypeOf(context).toEqualTypeOf<ExpectedContext<string>>();
  });
}

// A raw InvokableInstance value
{
  type TestSignature = <T>(
    args: { value: T; values: T[] },
    positional: string,
  ) => ComponentReturn<{
    foo: [T[], string];
    otherwise: [];
  }>;

  expectTypeOf(resolve(value<DirectInvokable<TestSignature>>())).toEqualTypeOf<TestSignature>();
}

// A `ComponentLike` whose `Args` is an index-signature map resolves to an
// invokable signature, the same as the equivalent expanded form. (Previously
// the index signature satisfied the expanded-form detection in
// `ComponentSignatureArgs`, normalizing the args to never/never and making
// the component uninvokable.)
{
  type NoArgs = Record<string, never>;

  const shorthand = resolve(value<ComponentLike<{ Args: NoArgs }>>());
  const expanded = resolve(value<ComponentLike<{ Args: { Named: NoArgs; Positional: [] } }>>());

  // Both forms resolve to the same signature...
  expectTypeOf(shorthand).toEqualTypeOf(expanded);

  // ...whose named args are optional, i.e. the component is invokable rather
  // than degrading to `(...args: never)`.
  expectTypeOf(shorthand).parameters.toEqualTypeOf<[named?: NamedArgs<NoArgs>]>();
}

// Values of type `any` or `never` (themselves typically the product of other type errors)
// shouldn't unnecessarily blow things up by producing an `unknown` signature.
{
  expectTypeOf(resolveOrReturn({} as any)).toEqualTypeOf<any>();
  expectTypeOf(resolveOrReturn({} as never)).toEqualTypeOf<never>();
  expectTypeOf(resolve({} as any)).toEqualTypeOf<any>();
  expectTypeOf(resolve({} as never)).toEqualTypeOf<never>();
}
