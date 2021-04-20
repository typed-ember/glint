import { ComponentLike } from '@glint/environment-ember-loose';
import { resolve, emitComponent } from '@glint/environment-ember-loose/-private/dsl';
import { expectTypeOf } from 'expect-type';

{
  const NoArgsComponent = {} as ComponentLike<{}>;

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
  interface YieldingComponentSignature {
    Args: {
      values: Array<number>;
    };
    Yields: {
      default: [number];
      else?: [];
    };
  }

  const YieldingComponent = {} as ComponentLike<YieldingComponentSignature>;

  // @ts-expect-error: missing required arg
  resolve(YieldingComponent)({});

  resolve(YieldingComponent)(
    { values: [] },
    // @ts-expect-error: extra positional arg
    'hi'
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
  interface PositionalArgsComponentSignature {
    Args: { key?: string };
    PositionalArgs: [name: string, age?: number];
  }

  const PositionalArgsComponent = {} as ComponentLike<PositionalArgsComponentSignature>;

  // @ts-expect-error: missing required positional arg
  resolve(PositionalArgsComponent)({});

  resolve(PositionalArgsComponent)(
    {},
    // @ts-expect-error: incorrect type for positional arg
    123
  );

  resolve(PositionalArgsComponent)(
    {},
    'a',
    1,
    // @ts-expect-error: extra positional arg
    true
  );

  resolve(PositionalArgsComponent)({}, 'a');
  resolve(PositionalArgsComponent)({}, 'a', 1);
}
