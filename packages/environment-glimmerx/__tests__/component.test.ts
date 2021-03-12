import Component from '@glint/environment-glimmerx/component';
import {
  template,
  invokeBlock,
  resolve,
  ResolveContext,
  yieldToBlock,
} from '@glint/environment-glimmerx/types';
import { expectTypeOf } from 'expect-type';
import { EmptyObject } from '@glint/template/-private/signature';

{
  class NoArgsComponent extends Component {
    static template = template(function* (𝚪: ResolveContext<NoArgsComponent>) {
      𝚪;
    });
  }

  // @ts-expect-error: extra named arg
  resolve(NoArgsComponent)({ foo: 'bar' });

  // @ts-expect-error: extra positional arg
  resolve(NoArgsComponent)({}, 'oops');

  // @ts-expect-error: never yields, so shouldn't accept blocks
  invokeBlock(resolve(NoArgsComponent)({}), { default() {} });

  invokeBlock(resolve(NoArgsComponent)({}), {});
}

{
  class StatefulComponent extends Component {
    private foo = 'hello';

    static template = template(function* (𝚪: ResolveContext<StatefulComponent>) {
      expectTypeOf(𝚪.this.foo).toEqualTypeOf<string>();
      expectTypeOf(𝚪.this).toEqualTypeOf<StatefulComponent>();
      expectTypeOf(𝚪.args).toEqualTypeOf<EmptyObject>();
    });
  }

  invokeBlock(resolve(StatefulComponent)({}), {});
}

{
  interface YieldingComponentSignature<T> {
    Args: {
      values: Array<T>;
    };
    Yields: {
      default: [T];
      inverse?: [];
    };
  }

  class YieldingComponent<T> extends Component<YieldingComponentSignature<T>> {
    static template = template(function* <T>(𝚪: ResolveContext<YieldingComponent<T>>) {
      expectTypeOf(𝚪.this).toEqualTypeOf<YieldingComponent<T>>();
      expectTypeOf(𝚪.args).toEqualTypeOf<{ values: T[] }>();

      if (𝚪.args.values.length) {
        yieldToBlock(𝚪, 'default', 𝚪.args.values[0]);
      } else {
        yieldToBlock(𝚪, 'inverse');
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

  invokeBlock(resolve(YieldingComponent)({ values: [1, 2, 3] }), {
    default(value) {
      expectTypeOf(value).toEqualTypeOf<number>();
    },
  });

  invokeBlock(resolve(YieldingComponent)({ values: [1, 2, 3] }), {
    default(...args) {
      expectTypeOf(args).toEqualTypeOf<[number]>();
    },

    inverse(...args) {
      expectTypeOf(args).toEqualTypeOf<[]>();
    },
  });
}
