import Component from '@glimmer/component';
import {
  templateForBackingValue,
  resolve,
  yieldToBlock,
  emitComponent,
  NamedArgsMarker,
} from '@glint/environment-ember-loose/-private/dsl';
import { expectTypeOf } from 'expect-type';
import { ComponentLike } from '@glint/template';

{
  class NoArgsComponent extends Component {}

  resolve(NoArgsComponent)({
    // @ts-expect-error: extra named arg
    foo: 'bar',
    ...NamedArgsMarker,
  });

  resolve(NoArgsComponent)(
    // @ts-expect-error: extra positional arg
    'oops'
  );

  {
    const component = emitComponent(resolve(NoArgsComponent)());

    {
      // @ts-expect-error: never yields, so shouldn't accept blocks
      component.blockParams.default;
    }
  }

  emitComponent(resolve(NoArgsComponent)());
}

{
  class StatefulComponent extends Component {
    private foo = 'hello';

    static {
      templateForBackingValue(this, function* (𝚪) {
        expectTypeOf(𝚪.this.foo).toEqualTypeOf<string>();
        expectTypeOf(𝚪.this).toEqualTypeOf<StatefulComponent>();
        expectTypeOf(𝚪.args).toEqualTypeOf<{}>();
      });
    }
  }

  emitComponent(resolve(StatefulComponent)());
}

{
  interface YieldingComponentSignature<T> {
    Args: {
      values: Array<T>;
    };
    Blocks: {
      default: [T];
      else: [];
    };
  }

  class YieldingComponent<T> extends Component<YieldingComponentSignature<T>> {
    static {
      templateForBackingValue(this, function* (𝚪) {
        // We can't directly assert on the type of e.g. `@values` here, as we don't
        // have a name for it in scope: the type `T` is present on the class instance,
        // but not in a `static` block. However, the yields below confirm that the
        // `@values` arg, since the only information we have about that type is that
        // the array element and the yielded value are the same.
        yieldToBlock(
          𝚪,
          'default'
        )(
          // @ts-expect-error: only a `T` is a valid yield
          123
        );

        if (𝚪.args.values.length) {
          yieldToBlock(𝚪, 'default')(𝚪.args.values[0]);
        } else {
          yieldToBlock(𝚪, 'else')();
        }
      });
    }
  }

  // @ts-expect-error: missing required arg `values`
  resolve(YieldingComponent)({ ...NamedArgsMarker });

  // @ts-expect-error: incorrect type for arg
  resolve(YieldingComponent)({ values: 'hello', ...NamedArgsMarker });

  resolve(YieldingComponent)({
    values: [1, 2, 3],
    // @ts-expect-error: extra arg
    oops: true,
    ...NamedArgsMarker,
  });

  {
    const component = emitComponent(
      resolve(YieldingComponent)({ values: [1, 2, 3], ...NamedArgsMarker })
    );

    {
      const [value] = component.blockParams.default;
      expectTypeOf(value).toEqualTypeOf<number>();
    }
  }

  {
    const component = emitComponent(
      resolve(YieldingComponent)({ values: [1, 2, 3], ...NamedArgsMarker })
    );

    {
      const [...args] = component.blockParams.default;
      expectTypeOf(args).toEqualTypeOf<[number]>();
    }

    {
      const [...args] = component.blockParams.else;
      expectTypeOf(args).toEqualTypeOf<[]>();
    }
  }
}

// Components are `ComponentLike`
{
  interface TestSignature {
    Args: { key: string };
    Blocks: {
      default: [value: string];
    };
    Element: HTMLDivElement;
  }

  class TestComponent extends Component<TestSignature> {}

  expectTypeOf(TestComponent).toMatchTypeOf<ComponentLike<TestSignature>>();
}
