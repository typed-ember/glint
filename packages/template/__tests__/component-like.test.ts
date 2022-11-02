import { ComponentLike, WithBoundArgs } from '@glint/template';
import { resolve, emitComponent, NamedArgsMarker } from '@glint/template/-private/dsl';
import { expectTypeOf } from 'expect-type';
import { ComponentReturn, NamedArgs } from '../-private/integration';

{
  const NoArgsComponent = {} as ComponentLike<{}>;

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
  interface YieldingComponentSignature {
    Args: {
      values: Array<number>;
    };
    Blocks: {
      default: [number];
      else: [];
    };
  }

  const YieldingComponent = {} as ComponentLike<YieldingComponentSignature>;

  // @ts-expect-error: missing required arg
  resolve(YieldingComponent)({ ...NamedArgsMarker });

  resolve(YieldingComponent)(
    'hi',
    // @ts-expect-error: extra positional arg
    { values: [], ...NamedArgsMarker }
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
  interface PositionalArgsComponentSignature {
    Args: {
      Named: { key?: string };
      Positional: [name: string, age?: number];
    };
  }

  const PositionalArgsComponent = {} as ComponentLike<PositionalArgsComponentSignature>;

  // @ts-expect-error: missing required positional arg
  resolve(PositionalArgsComponent)();

  resolve(PositionalArgsComponent)(
    'hello',
    // @ts-expect-error: incorrect type for positional arg
    'ok'
  );

  resolve(PositionalArgsComponent)(
    'a',
    1,
    // @ts-expect-error: extra positional arg
    true
  );

  resolve(PositionalArgsComponent)('a');
  resolve(PositionalArgsComponent)('a', 1);
}

// With pre-bound args
{
  let MyComponent!: ComponentLike<{
    Args: { foo: string; bar: number };
    Element: HTMLCanvasElement;
    Blocks: { default: [] };
  }>;

  let MyComponentReturn!: WithBoundArgs<typeof MyComponent, 'foo'>;

  expectTypeOf(resolve(MyComponentReturn)).toEqualTypeOf<
    (
      args: NamedArgs<{ foo?: string; bar: number }>
    ) => ComponentReturn<{ default: [] }, HTMLCanvasElement>
  >();
}
