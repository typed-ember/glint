import Component from '@glimmerx/component';
import {
  template,
  invokeBlock,
  resolve,
  ResolveContext,
  toBlock,
} from '@glint/environment-glimmerx/types';
import { expectTypeOf } from 'expect-type';
import { NoNamedArgs } from '@glint/template/-private';
import { BlockYield } from '@glint/template/-private/blocks';

{
  class NoArgsComponent extends Component<NoNamedArgs> {
    static template = template(function* (𝚪: ResolveContext<NoArgsComponent>) {
      𝚪;
    });
  }

  // @ts-expect-error: extra named arg
  resolve(NoArgsComponent)({ foo: 'bar' });

  // @ts-expect-error: extra positional arg
  resolve(NoArgsComponent)({}, 'oops');

  // @ts-expect-error: never yields, so shouldn't accept blocks
  invokeBlock(resolve(NoArgsComponent)({}), { *default() {} }, 'default');

  expectTypeOf(invokeBlock(resolve(NoArgsComponent)({}), {})).toBeNever();
}

{
  class StatefulComponent extends Component {
    private foo = 'hello';

    static template = template(function* (𝚪: ResolveContext<StatefulComponent>) {
      expectTypeOf(𝚪.this.foo).toEqualTypeOf<string>();
      expectTypeOf(𝚪.this).toEqualTypeOf<StatefulComponent>();
      expectTypeOf(𝚪.args).toEqualTypeOf<{}>();
    });
  }

  expectTypeOf(invokeBlock(resolve(StatefulComponent)({}), {})).toBeNever();
}

{
  class YieldingComponent<T> extends Component<{ values: T[] }> {
    static template = template(function* <T>(𝚪: ResolveContext<YieldingComponent<T>>) {
      expectTypeOf(𝚪.this).toEqualTypeOf<YieldingComponent<T>>();
      expectTypeOf(𝚪.args).toEqualTypeOf<{ values: T[] }>();

      if (𝚪.args.values.length) {
        yield toBlock('default', 𝚪.args.values[0]);
      } else {
        yield toBlock('inverse');
      }
    });
  }

  // @ts-expect-error: missing required arg
  resolve(YieldingComponent)({});

  // @ts-expect-error: incorrect type for arg
  resolve(YieldingComponent)({ values: 'hello' });

  // @ts-expect-error: extra arg
  resolve(YieldingComponent)({ values: [1, 2, 3], oops: true });

  // @ts-expect-error: invalid block name
  invokeBlock(resolve(YieldingComponent)({ values: [] }), { *foo() {} }, 'foo');

  expectTypeOf(
    invokeBlock(
      resolve(YieldingComponent)({ values: [1, 2, 3] }),
      {
        *default(value) {
          expectTypeOf(value).toEqualTypeOf<number>();
        },
      },
      'default'
    )
  ).toBeNever();

  expectTypeOf(
    invokeBlock(
      resolve(YieldingComponent)({ values: [1, 2, 3] }),
      {
        *default(value) {
          yield toBlock('default', [value]);
        },

        *inverse() {
          yield toBlock('default', [1, 2, 3]);
        },
      },
      'default',
      'inverse'
    )
  ).toEqualTypeOf<BlockYield<'default', [Array<number>]>>();
}
