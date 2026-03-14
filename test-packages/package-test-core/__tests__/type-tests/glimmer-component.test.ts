import Component from '@glimmer/component';
import {
  bindInvokable,
  emitComponent,
  NamedArgsMarker,
  resolve,
  resolveForBind,
  templateForBackingValue,
  yieldToBlock,
} from '@glint/ember-tsc/-private/dsl';
import { ComponentLike, WithBoundArgs } from '@glint/template';
import { expectTypeOf } from 'expect-type';

{
  class NoArgsComponent extends Component {}

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
}

{
  class StatefulComponent extends Component {
    private foo = 'hello';

    static {
      templateForBackingValue(this, function* (__glintRef__) {
        expectTypeOf(__glintRef__.this.foo).toEqualTypeOf<string>();
        expectTypeOf(__glintRef__.this).toEqualTypeOf<StatefulComponent>();
        expectTypeOf(__glintRef__.args).toEqualTypeOf<{}>();
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
      templateForBackingValue(this, function* (__glintRef__) {
        // We can't directly assert on the type of e.g. `@values` here, as we don't
        // have a name for it in scope: the type `T` is present on the class instance,
        // but not in a `static` block. However, the yields below confirm that the
        // `@values` arg, since the only information we have about that type is that
        // the array element and the yielded value are the same.
        yieldToBlock(
          __glintRef__,
          'default',
        )(
          // @ts-expect-error: only a `T` is a valid yield
          123,
        );

        if (__glintRef__.args.values.length) {
          yieldToBlock(__glintRef__, 'default')(__glintRef__.args.values[0]);
        } else {
          yieldToBlock(__glintRef__, 'else')();
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

// Issue #1068: {{component}} currying named args on generic class component.
// The keyword's Named/Return decomposition erases generic T. Fix: the codegen
// emits a comma expression — the keyword call validates arg types (errors on
// mapped positions), while bindInvokable uses Args/T holistic capture to
// preserve T via BindNamedResult conditional return type.
{
  class PickerOption<T> extends Component<{
    Args: { value: T; onSelect: (value: T) => void };
    Blocks: { default: [T] };
  }> {}

  class Picker<T> extends Component<{
    Args: { onSelect: (value: T) => void };
    Blocks: { default: [WithBoundArgs<typeof PickerOption, 'onSelect'>] };
  }> {
    static {
      templateForBackingValue(this, function (__glintRef__) {
        const componentKw =
          undefined as unknown as import('@glint/template/-private/keywords/component').ComponentKeyword;

        // Noop binding DOES preserve T
        const noopCurried = resolve(componentKw)(resolveForBind(PickerOption));
        const component = emitComponent(
          resolve(noopCurried)({
            value: 'test',
            onSelect: (v) => {},
            ...NamedArgsMarker,
          }),
        );
        expectTypeOf(component.blockParams.default[0]).toEqualTypeOf<string>();

        // Named args binding — bindInvokable preserves T via Args/T
        // holistic capture, while the keyword validates via comma expression.
        const curried = bindInvokable(resolveForBind(PickerOption), {
          onSelect: __glintRef__.args.onSelect,
          ...NamedArgsMarker,
        });
        yieldToBlock(__glintRef__, 'default')(curried);
      });
    }
  }

  emitComponent(resolve(Picker)({ onSelect: (v: string) => {}, ...NamedArgsMarker }));
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

  expectTypeOf(TestComponent).toExtend<ComponentLike<TestSignature>>();
}
