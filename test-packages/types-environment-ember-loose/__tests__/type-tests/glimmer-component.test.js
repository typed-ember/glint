var _a, _b;
import Component from '@glimmer/component';
import { templateForBackingValue, resolve, yieldToBlock, emitComponent, NamedArgsMarker, } from '@glint/environment-ember-loose/-private/dsl';
import { expectTypeOf } from 'expect-type';
{
    class NoArgsComponent extends Component {
    }
    resolve(NoArgsComponent)(
    // @ts-expect-error: extra positional arg
    'oops');
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
        constructor() {
            super(...arguments);
            this.foo = 'hello';
        }
    }
    _a = StatefulComponent;
    (() => {
        templateForBackingValue(_a, function* (__glintRef__) {
            expectTypeOf(__glintRef__.this.foo).toEqualTypeOf();
            expectTypeOf(__glintRef__.this).toEqualTypeOf();
            expectTypeOf(__glintRef__.args).toEqualTypeOf();
        });
    })();
    emitComponent(resolve(StatefulComponent)());
}
{
    class YieldingComponent extends Component {
    }
    _b = YieldingComponent;
    (() => {
        templateForBackingValue(_b, function* (__glintRef__) {
            // We can't directly assert on the type of e.g. `@values` here, as we don't
            // have a name for it in scope: the type `T` is present on the class instance,
            // but not in a `static` block. However, the yields below confirm that the
            // `@values` arg, since the only information we have about that type is that
            // the array element and the yielded value are the same.
            yieldToBlock(__glintRef__, 'default')(
            // @ts-expect-error: only a `T` is a valid yield
            123);
            if (__glintRef__.args.values.length) {
                yieldToBlock(__glintRef__, 'default')(__glintRef__.args.values[0]);
            }
            else {
                yieldToBlock(__glintRef__, 'else')();
            }
        });
    })();
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
        const component = emitComponent(resolve(YieldingComponent)({ values: [1, 2, 3], ...NamedArgsMarker }));
        {
            const [value] = component.blockParams.default;
            expectTypeOf(value).toEqualTypeOf();
        }
    }
    {
        const component = emitComponent(resolve(YieldingComponent)({ values: [1, 2, 3], ...NamedArgsMarker }));
        {
            const [...args] = component.blockParams.default;
            expectTypeOf(args).toEqualTypeOf();
        }
        {
            const [...args] = component.blockParams.else;
            expectTypeOf(args).toEqualTypeOf();
        }
    }
}
// Components are `ComponentLike`
{
    class TestComponent extends Component {
    }
    expectTypeOf(TestComponent).toMatchTypeOf();
}
//# sourceMappingURL=glimmer-component.test.js.map