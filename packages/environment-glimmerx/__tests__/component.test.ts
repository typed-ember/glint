import Component, { TemplateComponent as TC } from '@glimmerx/component';
import {
  templateForBackingValue,
  templateExpression,
  resolve,
  yieldToBlock,
  emitComponent,
  NamedArgsMarker,
} from '@glint/environment-glimmerx/-private/dsl';
import { expectTypeOf } from 'expect-type';
import { ComponentReturn, EmptyObject } from '@glint/template/-private/integration';

{
  class NoArgsComponent extends Component {
    static template = templateForBackingValue(this, function (𝚪) {
      𝚪;
    });
  }

  resolve(NoArgsComponent)({
    // @ts-expect-error: extra named arg
    foo: 'bar',
    ...NamedArgsMarker,
  });

  resolve(NoArgsComponent)(
    // @ts-expect-error: bad positional arg
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

    static template = templateForBackingValue(this, function (𝚪) {
      expectTypeOf(𝚪.this.foo).toEqualTypeOf<string>();
      expectTypeOf(𝚪.this).toEqualTypeOf<StatefulComponent>();
      expectTypeOf(𝚪.args).toEqualTypeOf<EmptyObject>();
    });
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

  resolve(YieldingComponent)(
    // @ts-expect-error: missing required arg
    { ...NamedArgsMarker }
  );

  resolve(YieldingComponent)({
    // @ts-expect-error: incorrect type for arg
    values: 'hello',
    ...NamedArgsMarker,
  });

  resolve(YieldingComponent)({
    values: [1, 2, 3],
    // @ts-expect-error: extra arg
    oops: true,
    ...NamedArgsMarker,
  });

  type InferSignature<T> = T extends Component<infer Signature> ? Signature : never;
  expectTypeOf<InferSignature<YieldingComponent<number>>>().toEqualTypeOf<
    YieldingComponentSignature<number>
  >();

  {
    const component = emitComponent(resolve(YieldingComponent)({ values: [], ...NamedArgsMarker }));

    {
      // @ts-expect-error: invalid block name
      component.blockParams.foo;
    }
  }

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

{
  const NoAnnotationTC = templateExpression(function (𝚪) {
    expectTypeOf(𝚪.this).toBeVoid();
    expectTypeOf(𝚪.element).toBeVoid();
    expectTypeOf(𝚪.args).toEqualTypeOf<EmptyObject>();
    expectTypeOf(𝚪.blocks).toEqualTypeOf<EmptyObject>();
  });

  expectTypeOf(resolve(NoAnnotationTC)).toEqualTypeOf<() => ComponentReturn<EmptyObject>>();
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
      yieldToBlock(𝚪, 'default')(𝚪.args.values[0]);
    } else {
      yieldToBlock(𝚪, 'else')();
    }
  });

  resolve(YieldingTC)(
    // @ts-expect-error: missing required arg
    { ...NamedArgsMarker }
  );

  resolve(YieldingTC)({
    // @ts-expect-error: incorrect type for arg
    values: 'hello',
    ...NamedArgsMarker,
  });

  resolve(YieldingTC)({
    values: [1, 2, 3],
    // @ts-expect-error: extra arg
    oops: true,
    ...NamedArgsMarker,
  });

  {
    const component = emitComponent(resolve(YieldingTC)({ values: [], ...NamedArgsMarker }));

    {
      // @ts-expect-error: invalid block name
      component.blockParams.foo;
    }
  }

  {
    const component = emitComponent(resolve(YieldingTC)({ values: [1, 2, 3], ...NamedArgsMarker }));

    {
      const [value] = component.blockParams.default;
      expectTypeOf(value).toEqualTypeOf<number>();
    }
  }

  {
    const component = emitComponent(resolve(YieldingTC)({ values: [1, 2, 3], ...NamedArgsMarker }));

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
