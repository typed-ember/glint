import { expectTypeOf } from 'expect-type';
import {
  applyModifier,
  emitComponent,
  emitElement,
  emitValue,
  bindBlocks,
  resolve,
  ResolveContext,
  resolveOrReturn,
  template,
  yieldToBlock,
} from '../-private/dsl';
import TestComponent, { globals } from './test-component';

type MyComponentSignature<T> = {
  Args: {
    name?: string;
    value: T;
  };
  Yields: {
    body?: [boolean, T];
  };
  Element: HTMLDivElement;
};

class MyComponent<T> extends TestComponent<MyComponentSignature<T>> {
  private state = { ready: false };

  private wrapperClicked(event: MouseEvent): void {
    console.log('clicked', event.x, event.y);
  }

  /**
   * ```hbs
   * {{#let this.state.ready as |isReady|}}
   *   <div {{on 'click' this.wrapperClicked}}>
   *     {{yield isReady @value to="body"}}
   *   </div>
   * {{/let}}
   * ```
   */
  public static template = template(function <T>(𝚪: ResolveContext<MyComponent<T>>) {
    emitComponent(resolve(globals.let)({}, 𝚪.this.state.ready), (component) => {
      bindBlocks(component.blockParams, {
        default(isReady) {
          emitElement('div', (𝛄) => {
            expectTypeOf(𝛄).toEqualTypeOf<{ element: HTMLDivElement }>();
            applyModifier(𝛄.element, resolve(globals.on)({}, 'click', 𝚪.this.wrapperClicked));
          });

          yieldToBlock(𝚪, 'body', isReady, 𝚪.args.value);

          yieldToBlock(
            𝚪,
            // @ts-expect-error: bad block
            'bad',
            isReady,
            𝚪.args.value
          );

          // @ts-expect-error: missing params
          yieldToBlock(𝚪, 'body');

          yieldToBlock(
            𝚪,
            'body',
            isReady,
            // @ts-expect-error: wrong param type
            Symbol()
          );
        },
      });
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
 *   </:body>
 * </MyComponent>
 */
emitComponent(resolve(MyComponent)({ value: 'hi' }), (component) => {
  bindBlocks(component.blockParams, {
    body(isReady, value) {
      expectTypeOf(isReady).toEqualTypeOf<boolean>();
      expectTypeOf(value).toEqualTypeOf<string>();

      emitValue(resolveOrReturn(value)({}));
      emitValue(resolveOrReturn(isReady)({}));
    },
  });
});

/**
 * Instantiate `T` to `number` and verify it's threaded through:
 *
 * hbs```
 * <MyComponent @value={{123}}>
 *   <:body as |isReady value|>
 *     Ready? {{value}}: {{isReady}}
 *   </:body>
 * </MyComponent>
 */
emitComponent(resolve(MyComponent)({ value: 123 }), (component) => {
  bindBlocks(component.blockParams, {
    body(isReady, value) {
      expectTypeOf(isReady).toEqualTypeOf<boolean>();
      expectTypeOf(value).toEqualTypeOf<number>();

      emitValue(resolveOrReturn(value)({}));
      emitValue(resolveOrReturn(isReady)({}));
    },
  });
});

/**
 * Invoke the component inline, which is valid since it has no
 * required blocks.
 *
 * hbs```
 * {{MyComponent value=123}}
 * ```
 */
emitValue(resolve(MyComponent)({ value: 123 }));

/**
 * Ensure we can invoke a maybe-undefined component.
 */
declare const MaybeMyComponent: typeof MyComponent | undefined;

emitComponent(resolve(MaybeMyComponent)({ value: 'hi' }), (component) => {
  bindBlocks(component.blockParams, {});
});

emitComponent(resolveOrReturn(MaybeMyComponent)({ value: 'hi' }), (component) => {
  bindBlocks(component.blockParams, {});
});

/**
 * Constrained type parameters can be tricky, and `expect-type` doesn't
 * work well with type assertions directly against them, but we can assert
 * against a property that the constraint dictates must exist to ensure
 * that we don't break or degrade them to `unknown` or `any` when used
 * in a template.
 */
export function testConstrainedTypeParameter<T extends { foo: 'bar' }>(value: T): void {
  let result = resolveOrReturn(value)({});
  expectTypeOf(result.foo).toEqualTypeOf<'bar'>();
}
