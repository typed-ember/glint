import '@glint/environment-ember-loose/native-integration';
import templateOnlyComponent from '@ember/component/template-only';
import {
  template,
  resolve,
  ResolveContext,
  emitComponent,
} from '@glint/environment-ember-loose/-private/dsl';
import { AcceptsBlocks } from '@glint/template/-private/integration';
import { expectTypeOf } from 'expect-type';
import { ComponentKeyword } from '../../-private/intrinsics/component';
import { EmptyObject } from '@glimmer/component/dist/types/addon/-private/component';

{
  const NoArgsComponent = templateOnlyComponent();

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

  template(function (𝚪: ResolveContext<typeof NoArgsComponent>) {
    expectTypeOf(𝚪.this).toBeVoid();
    expectTypeOf(𝚪.args).toEqualTypeOf<EmptyObject>();
    expectTypeOf(𝚪.element).toBeNull();
    expectTypeOf(𝚪.yields).toEqualTypeOf<EmptyObject>();
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

  {
    const component = emitComponent(resolve(YieldingComponent)({ values: [1, 2, 3] }));
    const [value] = component.blockParams.default;
    expectTypeOf(value).toEqualTypeOf<number>();
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

  template(function (𝚪: ResolveContext<typeof YieldingComponent>) {
    expectTypeOf(𝚪.this).toBeVoid();
    expectTypeOf(𝚪.args).toEqualTypeOf<YieldingComponentSignature['Args']>();
    expectTypeOf(𝚪.element).toEqualTypeOf<YieldingComponentSignature['Element']>();
    expectTypeOf(𝚪.yields).toEqualTypeOf<YieldingComponentSignature['Blocks']>();
  });
}

// Template-only components can be the target of `{{component}}`
{
  interface CurriedComponentSignature {
    Args: {
      a: string;
      b: number;
    };
  }

  const CurriedComponent = templateOnlyComponent<CurriedComponentSignature>();
  const componentKeyword = null as unknown as ComponentKeyword<{
    'curried-component': typeof CurriedComponent;
  }>;

  const CurriedWithNothing = resolve(componentKeyword)({}, 'curried-component');
  expectTypeOf(resolve(CurriedWithNothing)).toEqualTypeOf<
    (args: { a: string; b: number }) => AcceptsBlocks<EmptyObject>
  >();

  const CurriedWithA = resolve(componentKeyword)({ a: 'hi' }, 'curried-component');
  expectTypeOf(resolve(CurriedWithA)).toEqualTypeOf<
    (args: { a?: string; b: number }) => AcceptsBlocks<EmptyObject>
  >();
}
