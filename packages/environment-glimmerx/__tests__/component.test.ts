import Component, { TemplateComponent as TC } from '@glimmerx/component';
import {
  templateForBackingValue,
  templateExpression,
  resolve,
  yieldToBlock,
  emitComponent,
} from '@glint/environment-glimmerx/-private/dsl';
import { expectTypeOf } from 'expect-type';
import { AcceptsBlocks, EmptyObject } from '@glint/template/-private/integration';

{
  class NoArgsComponent extends Component {
    static template = templateForBackingValue(this, function (𝚪) {
      𝚪;
    });
  }

  resolve(NoArgsComponent)({
    // @ts-expect-error: extra named arg
    foo: 'bar',
  });

  resolve(NoArgsComponent)(
    {},
    // @ts-expect-error: extra positional arg
    'oops'
  );

  {
    const component = emitComponent(resolve(NoArgsComponent)({}));

    {
      // @ts-expect-error: never yields, so shouldn't accept blocks
      component.blockParams.default;
    }
  }

  emitComponent(resolve(NoArgsComponent)({}));
}

{
  class StatefulComponent extends Component {
    private foo = 'hello';

    static template = templateForBackingValue(this, function (𝚪) {
      expectTypeOf(𝚪.this.foo).toEqualTypeOf<string>();
      expectTypeOf(𝚪.this).toEqualTypeOf<StatefulComponent>();
      expectTypeOf(𝚪.args).toEqualTypeOf<EmptyObject>();
    });
  }

  emitComponent(resolve(StatefulComponent)({}));
}

{
  interface YieldingComponentSignature<T> {
    Args: {
      values: Array<T>;
    };
    Blocks: {
      default: [T];
      else?: [];
    };
  }

  class YieldingComponent<T> extends Component<YieldingComponentSignature<T>> {
    static template = templateForBackingValue(this, function (𝚪) {
      // We can't directly assert on the type of e.g. `@values` here, as we don't
      // have a name for it in scope: the type `T` is present on the class instance,
      // but not in a `static` block. However, the yields below confirm that the
      // `@values` arg, since the only information we have about that type is that
      // the array element and the yielded value are the same.
      yieldToBlock(
        𝚪,
        'default',
        // @ts-expect-error: only a `T` is a valid yield
        123
      );

      if (𝚪.args.values.length) {
        yieldToBlock(𝚪, 'default', 𝚪.args.values[0]);
      } else {
        yieldToBlock(𝚪, 'else');
      }
    });
  }

  resolve(YieldingComponent)(
    // @ts-expect-error: missing required arg
    {}
  );

  resolve(YieldingComponent)({
    // @ts-expect-error: incorrect type for arg
    values: 'hello',
  });

  resolve(YieldingComponent)({
    values: [1, 2, 3],
    // @ts-expect-error: extra arg
    oops: true,
  });

  type InferSignature<T> = T extends Component<infer Signature> ? Signature : never;
  expectTypeOf<InferSignature<YieldingComponent<number>>>().toEqualTypeOf<
    YieldingComponentSignature<number>
  >();

  {
    const component = emitComponent(resolve(YieldingComponent)({ values: [] }));

    {
      // @ts-expect-error: invalid block name
      component.blockParams.foo;
    }
  }

  {
    const component = emitComponent(resolve(YieldingComponent)({ values: [1, 2, 3] }));

    {
      const [value] = component.blockParams.default;
      expectTypeOf(value).toEqualTypeOf<number>();
    }
  }

  {
    const component = emitComponent(resolve(YieldingComponent)({ values: [1, 2, 3] }));

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

{
  const NoAnnotationTC = templateExpression(function (𝚪) {
    expectTypeOf(𝚪.this).toBeVoid();
    expectTypeOf(𝚪.element).toBeVoid();
    expectTypeOf(𝚪.args).toEqualTypeOf<EmptyObject>();
    expectTypeOf(𝚪.blocks).toEqualTypeOf<EmptyObject>();
  });

  expectTypeOf(resolve(NoAnnotationTC)).toEqualTypeOf<
    (args: EmptyObject) => AcceptsBlocks<EmptyObject>
  >();
}

{
  interface YieldingTCSignature {
    Args: {
      values: Array<number>;
    };
    Blocks: {
      default: [number];
      else?: [];
    };
  }

  let YieldingTC: TC<YieldingTCSignature> = templateExpression(function (𝚪) {
    expectTypeOf(𝚪.this).toEqualTypeOf(null);
    expectTypeOf(𝚪.args).toEqualTypeOf<{ values: Array<number> }>();
    expectTypeOf(𝚪.element).toBeNull();
    expectTypeOf(𝚪.blocks).toEqualTypeOf<YieldingTCSignature['Blocks']>();

    if (𝚪.args.values.length) {
      yieldToBlock(𝚪, 'default', 𝚪.args.values[0]);
    } else {
      yieldToBlock(𝚪, 'else');
    }
  });

  resolve(YieldingTC)(
    // @ts-expect-error: missing required arg
    {}
  );

  resolve(YieldingTC)({
    // @ts-expect-error: incorrect type for arg
    values: 'hello',
  });

  resolve(YieldingTC)({
    values: [1, 2, 3],
    // @ts-expect-error: extra arg
    oops: true,
  });

  {
    const component = emitComponent(resolve(YieldingTC)({ values: [] }));

    {
      // @ts-expect-error: invalid block name
      component.blockParams.foo;
    }
  }

  {
    const component = emitComponent(resolve(YieldingTC)({ values: [1, 2, 3] }));

    {
      const [value] = component.blockParams.default;
      expectTypeOf(value).toEqualTypeOf<number>();
    }
  }

  {
    const component = emitComponent(resolve(YieldingTC)({ values: [1, 2, 3] }));

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
