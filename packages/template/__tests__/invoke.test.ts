import '@glint/template/glimmer';

import GlimmerComponent from '@glimmer/component';
import {
  template,
  resolve,
  toBlock,
  invokeBlock,
  ResolveContext,
  BuiltIns,
  invokeModifier,
  invokeInline,
  resolveOrReturn,
} from '@glint/template';
import { expectTypeOf } from 'expect-type';
import { BlockYield } from '@glint/template/-private/blocks';

type MyComponentArgs<T> = {
  name?: string;
  value: T;
};

class MyComponent<T> extends GlimmerComponent<MyComponentArgs<T>> {
  private state = { ready: false };

  private wrapperClicked(message: string, event: MouseEvent): void {
    console.log(message, event.x, event.y);
  }

  /**
   * ```hbs
   * {{#let this.state.ready as |isReady|}}
   *   <div {{on 'click' (fn this.wrapperClicked 'clicked!')}}>
   *     {{yield isReady @value to="body"}}
   *   </div>
   * {{/let}}
   * ```
   */
  public static template = template(function* <T>(𝚪: ResolveContext<MyComponent<T>>) {
    yield invokeBlock(resolve(BuiltIns['let'])({}, 𝚪.this.state.ready), {
      *default(isReady) {
        invokeModifier(
          resolve(BuiltIns['on'])(
            {},
            'click',
            invokeInline(resolve(BuiltIns['fn'])({}, 𝚪.this.wrapperClicked, 'clicked!'))
          )
        );

        yield toBlock('body', isReady, 𝚪.args.value);
      },
    });
  });
}

/**
 * Instantiate `T` to `string` and verify it's threaded through:
 *
 * hbs```
 * <MyComponent @value="hi">
 *   <:body as |isReady value|>
 *     Ready? {{value}}: {{isReady}}
 *     <br>
 *     {{yield value}}
 *   </:body>
 * </MyComponent>
 */
expectTypeOf(
  invokeBlock(resolve(MyComponent)({ value: 'hi' }), {
    *body(isReady, value) {
      expectTypeOf(invokeInline(resolveOrReturn(value)({}))).toEqualTypeOf<string>();
      expectTypeOf(invokeInline(resolveOrReturn(isReady)({}))).toEqualTypeOf<boolean>();

      yield toBlock('default', value);
    },
  })
).toEqualTypeOf<BlockYield<'default', [string]>>();

/**
 * Instantiate `T` to `number` and verify it's threaded through:
 *
 * hbs```
 * <MyComponent @value={{123}}>
 *   <:body as |isReady value|>
 *     Ready? {{value}}: {{isReady}}
 *     {{yield value}}
 *   </:body>
 * </MyComponent>
 */
expectTypeOf(
  invokeBlock(resolve(MyComponent)({ value: 123 }), {
    *body(isReady, value) {
      expectTypeOf(invokeInline(resolveOrReturn(value)({}))).toEqualTypeOf<number>();
      expectTypeOf(invokeInline(resolveOrReturn(isReady)({}))).toEqualTypeOf<boolean>();

      yield toBlock('default', value);
    },
  })
).toEqualTypeOf<BlockYield<'default', [number]>>();

/**
 * Constrained type parameters can be tricky, and `expect-type` doesn't
 * work well with type assertions directly against them, but we can assert
 * against a property that the constraint dictates must exist to ensure
 * that we don't break or degrade them to `unknown` or `any` when used
 * in a template.
 */
export function testConstrainedTypeParameter<T extends { foo: 'bar' }>(value: T): void {
  let result = invokeInline(resolveOrReturn(value)({}));
  expectTypeOf(result.foo).toEqualTypeOf<'bar'>();
}
