import templateOnlyComponent from '@ember/component/template-only';
import {
  templateForBackingValue,
  resolve,
  emitComponent,
  NamedArgsMarker,
} from '@glint/environment-ember-loose/-private/dsl';
import { expectTypeOf } from 'expect-type';
import { ComponentLike, WithBoundArgs } from '@glint/template';

{
  const NoArgsComponent = templateOnlyComponent();

  resolve(NoArgsComponent)(
    // @ts-expect-error: extra positional arg
    'oops',
  );

  {
    const component = emitComponent(resolve(NoArgsComponent)());

    {
      // @ts-expect-error: never yields, so shouldn't accept blocks
      component.blockParams.default;
    }
  }

  emitComponent(resolve(NoArgsComponent)());

  templateForBackingValue(NoArgsComponent, function (__glintRef__) {
    expectTypeOf(__glintRef__.this).toBeNull();
    expectTypeOf(__glintRef__.args).toEqualTypeOf<{}>();
    expectTypeOf(__glintRef__.element).toBeUnknown();
    expectTypeOf(__glintRef__.blocks).toEqualTypeOf<{}>();
  });
}

{
  interface YieldingComponentSignature {
    Element: HTMLImageElement;
    Args: {
      values: Array<number>;
    };
    Blocks: {
      default: [number];
      else: [];
    };
  }

  const YieldingComponent = templateOnlyComponent<YieldingComponentSignature>();

  resolve(YieldingComponent)(
    // @ts-expect-error: missing required arg
    { ...NamedArgsMarker },
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
      resolve(YieldingComponent)({ values: [1, 2, 3], ...NamedArgsMarker }),
    );
    const [value] = component.blockParams.default;
    expectTypeOf(value).toEqualTypeOf<number>();
  }

  {
    const component = emitComponent(
      resolve(YieldingComponent)({ values: [1, 2, 3], ...NamedArgsMarker }),
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

  templateForBackingValue(YieldingComponent, function (__glintRef__) {
    expectTypeOf(__glintRef__.this).toBeNull();
    expectTypeOf(__glintRef__.args).toEqualTypeOf<YieldingComponentSignature['Args']>();
    expectTypeOf(__glintRef__.element).toEqualTypeOf<YieldingComponentSignature['Element']>();
    expectTypeOf(__glintRef__.blocks).toEqualTypeOf<YieldingComponentSignature['Blocks']>();
  });
}

// Template-only components are `ComponentLike`
{
  interface TestSignature {
    Args: {
      item: string;
    };
    Blocks: {
      default: [greeting: string];
    };
    Element: HTMLParagraphElement;
  }

  const BasicTOC = templateOnlyComponent<TestSignature>();
  expectTypeOf(BasicTOC).toMatchTypeOf<ComponentLike<TestSignature>>();

  // and therefore works correctly with `WithBoundArgs`
  expectTypeOf<WithBoundArgs<typeof BasicTOC, 'item'>>().not.toBeNever();
}
