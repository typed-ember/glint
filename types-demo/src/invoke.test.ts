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
import { expectType } from 'tsd';
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
expectType<BlockYield<'default', [string]>>(
  invokeBlock(resolve(MyComponent)({ value: 'hi' }), {
    *body(isReady, value) {
      expectType<string>(invokeInline(resolveOrReturn(value)({})));
      expectType<boolean>(invokeInline(resolveOrReturn(isReady)({})));

      yield toBlock('default', value);
    },
  })
);

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
expectType<BlockYield<'default', [number]>>(
  invokeBlock(resolve(MyComponent)({ value: 123 }), {
    *body(isReady, value) {
      expectType<number>(invokeInline(resolveOrReturn(value)({})));
      expectType<boolean>(invokeInline(resolveOrReturn(isReady)({})));

      yield toBlock('default', value);
    },
  })
);
