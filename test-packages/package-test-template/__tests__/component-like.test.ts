import { ComponentLike, WithBoundArgs } from '@glint/template';
import { resolve, emitComponent, NamedArgsMarker } from '@glint/template/-private/dsl';
import { expectTypeOf } from 'expect-type';
import { ComponentReturn, NamedArgs } from '../-private/integration';
import TestComponent from './test-component';

{
  const NoArgsComponent = {} as ComponentLike<{}>;

  // @ts-expect-error: extra arg
  resolve(NoArgsComponent)({
    ...NamedArgsMarker,
  });

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
    { values: [], ...NamedArgsMarker },
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

    {
      const [value] = component.blockParams.default;
      expectTypeOf(value).toEqualTypeOf<number>();
    }
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
  resolve(PositionalArgsComponent)({ ...NamedArgsMarker });

  resolve(PositionalArgsComponent)(
    'hello',
    // @ts-expect-error: incorrect type for positional arg
    'ok',
  );

  resolve(PositionalArgsComponent)(
    'a',
    1,
    // @ts-expect-error: extra positional arg
    true,
  );

  resolve(PositionalArgsComponent)('a');
  resolve(PositionalArgsComponent)('a', 1);
}

// Unions of arg types
{
  interface UnionSignature {
    Args: {
      Positional: [full: string] | [first: string, last: string];
      Named: { force: boolean } | Partial<{ foo: string; bar: string }>;
    };
  }

  let definition!: ComponentLike<UnionSignature>;
  let info = resolve(definition);

  expectTypeOf(info).toEqualTypeOf<
    (
      ...args:
        | [full: string, named: NamedArgs<{ force: boolean }>]
        | [full: string, named?: NamedArgs<Partial<{ foo: string; bar: string }>>]
        | [first: string, last: string, named: NamedArgs<{ force: boolean }>]
        | [first: string, last: string, named?: NamedArgs<Partial<{ foo: string; bar: string }>>]
    ) => ComponentReturn<{}>
  >();
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
      args: NamedArgs<{ foo?: string; bar: number }>,
    ) => ComponentReturn<{ default: [] }, HTMLCanvasElement>
  >();
}

// Assignability
{
  // A component with no signaure is a `ComponentLike` with no signature
  expectTypeOf(TestComponent<{}>).toMatchTypeOf<ComponentLike>();

  // A component whose args are all optional is a `ComponentLike` with no signature
  expectTypeOf(TestComponent<{ Args: { optional?: true } }>).toMatchTypeOf<ComponentLike>();

  // A component with a required arg can't be used as a blank `ComponentLike`
  expectTypeOf(TestComponent<{ Args: { optional: false } }>).not.toMatchTypeOf<ComponentLike>();

  // A component that yields a given block can be used without ever passing any blocks
  expectTypeOf(TestComponent<{ Blocks: { default: [string] } }>).toMatchTypeOf<ComponentLike>();

  // A component that yields specific args can be used as one that cares about fewer of them
  expectTypeOf(TestComponent<{ Blocks: { default: [string, number] } }>).toMatchTypeOf<
    ComponentLike<{ Blocks: { default: [string, ...unknown[]] } }>
  >();

  // A component that never yields can't be used as one that accepts a specific block
  expectTypeOf(TestComponent).not.toMatchTypeOf<ComponentLike<{ Blocks: { default: [] } }>>();

  // `T | null` is useful to humans to signify that a component might splat its ...attributes,
  // but from a type perspective it's just the same as `T`
  expectTypeOf<ComponentLike<{ Element: HTMLDivElement | null }>>().toEqualTypeOf<
    ComponentLike<{ Element: HTMLDivElement }>
  >();

  // Our canonical internal representation of a no-splattributes component's `Element` is `unknown`
  expectTypeOf<ComponentLike>().toEqualTypeOf<ComponentLike<{ Element: unknown }>>();
  expectTypeOf<ComponentLike<{ Element: null }>>().toEqualTypeOf<
    ComponentLike<{ Element: unknown }>
  >();

  // A component with all-optional args and any arbitrary element/blocks should be usable
  // as a blank `ComponentLike`.
  expectTypeOf(
    TestComponent<{
      Args: { foo?: string };
      Element: HTMLImageElement;
      Blocks: { default: [] };
    }>,
  ).toMatchTypeOf<ComponentLike>();

  // Components are contravariant with their named `Args` type
  expectTypeOf<ComponentLike<{ Args: { name: string } }>>().toMatchTypeOf<
    ComponentLike<{ Args: { name: 'Dan' } }>
  >();
  expectTypeOf<ComponentLike<{ Args: { name: 'Dan' } }>>().not.toMatchTypeOf<
    ComponentLike<{ Args: { name: string } }>
  >();

  // Components are contravariant with their positional `Args` type
  expectTypeOf<ComponentLike<{ Args: { Positional: [name: string] } }>>().toMatchTypeOf<
    ComponentLike<{ Args: { Positional: [name: 'Dan'] } }>
  >();
  expectTypeOf<ComponentLike<{ Args: { Positional: [name: 'Dan'] } }>>().not.toMatchTypeOf<
    ComponentLike<{ Args: { Positional: [name: string] } }>
  >();

  // Components are covariant with their `Element` type
  expectTypeOf<ComponentLike<{ Element: HTMLAudioElement }>>().toMatchTypeOf<
    ComponentLike<{ Element: HTMLElement }>
  >();
  expectTypeOf<ComponentLike<{ Element: HTMLElement }>>().not.toMatchTypeOf<
    ComponentLike<{ Element: HTMLAudioElement }>
  >();

  // Components are covariant with their `Blocks`' `Params` types
  expectTypeOf(TestComponent<{ Blocks: { default: ['abc', 123] } }>).toMatchTypeOf<
    ComponentLike<{ Blocks: { default: [string, number] } }>
  >();
  expectTypeOf(TestComponent<{ Blocks: { default: [string, number] } }>).not.toMatchTypeOf<
    ComponentLike<{ Blocks: { default: ['abc', 123] } }>
  >();
}
