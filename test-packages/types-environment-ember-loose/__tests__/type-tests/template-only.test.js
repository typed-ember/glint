import templateOnlyComponent from '@ember/component/template-only';
import { templateForBackingValue, resolve, emitComponent, NamedArgsMarker, } from '@glint/environment-ember-loose/-private/dsl';
import { expectTypeOf } from 'expect-type';
{
    const NoArgsComponent = templateOnlyComponent();
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
    templateForBackingValue(NoArgsComponent, function (__glintRef__) {
        expectTypeOf(__glintRef__.this).toBeNull();
        expectTypeOf(__glintRef__.args).toEqualTypeOf();
        expectTypeOf(__glintRef__.element).toBeUnknown();
        expectTypeOf(__glintRef__.blocks).toEqualTypeOf();
    });
}
{
    const YieldingComponent = templateOnlyComponent();
    resolve(YieldingComponent)(
    // @ts-expect-error: missing required arg
    { ...NamedArgsMarker });
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
        const component = emitComponent(resolve(YieldingComponent)({ values: [1, 2, 3], ...NamedArgsMarker }));
        const [value] = component.blockParams.default;
        expectTypeOf(value).toEqualTypeOf();
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
    templateForBackingValue(YieldingComponent, function (__glintRef__) {
        expectTypeOf(__glintRef__.this).toBeNull();
        expectTypeOf(__glintRef__.args).toEqualTypeOf();
        expectTypeOf(__glintRef__.element).toEqualTypeOf();
        expectTypeOf(__glintRef__.blocks).toEqualTypeOf();
    });
}
// Template-only components are `ComponentLike`
{
    const BasicTOC = templateOnlyComponent();
    expectTypeOf(BasicTOC).toMatchTypeOf();
    // and therefore works correctly with `WithBoundArgs`
    expectTypeOf().not.toBeNever();
}
//# sourceMappingURL=template-only.test.js.map