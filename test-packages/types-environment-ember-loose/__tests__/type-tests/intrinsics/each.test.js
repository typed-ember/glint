import { expectTypeOf } from 'expect-type';
import { Globals, resolve, emitComponent, NamedArgsMarker, } from '@glint/environment-ember-loose/-private/dsl';
let each = resolve(Globals['each']);
// Yield out array values and indices
{
    const component = emitComponent(each(['a', 'b', 'c']));
    {
        const [value, index] = component.blockParams.default;
        expectTypeOf(value).toEqualTypeOf();
        expectTypeOf(index).toEqualTypeOf();
    }
    {
        const [...args] = component.blockParams.else;
        expectTypeOf(args).toEqualTypeOf();
    }
}
{
    const component = emitComponent(each(proxiedArray));
    {
        const [value, index] = component.blockParams.default;
        expectTypeOf(value).toEqualTypeOf();
        expectTypeOf(index).toEqualTypeOf();
    }
}
// Works for other iterables
{
    const component = emitComponent(each(new Map()));
    {
        const [[key, value], index] = component.blockParams.default;
        expectTypeOf(key).toEqualTypeOf();
        expectTypeOf(value).toEqualTypeOf();
        expectTypeOf(index).toEqualTypeOf();
    }
}
// Works for `readonly` arrays
{
    const component = emitComponent(each(['a', 'b', 'c']));
    {
        const [value, index] = component.blockParams.default;
        expectTypeOf(value).toEqualTypeOf();
        expectTypeOf(index).toEqualTypeOf();
    }
}
// Accept a `key` string
{
    const component = emitComponent(each([{ id: 1 }], { key: 'id', ...NamedArgsMarker }));
    {
        const [value, index] = component.blockParams.default;
        expectTypeOf(value).toEqualTypeOf();
        expectTypeOf(index).toEqualTypeOf();
    }
}
// Works for undefined
{
    const component = emitComponent(each(arrayOrUndefined));
    {
        const [value, index] = component.blockParams.default;
        expectTypeOf(value).toEqualTypeOf();
        expectTypeOf(index).toEqualTypeOf();
    }
}
// Works for null
{
    const component = emitComponent(each(arrayOrNull));
    {
        const [value, index] = component.blockParams.default;
        expectTypeOf(value).toEqualTypeOf();
        expectTypeOf(index).toEqualTypeOf();
    }
}
// Gives `any` given `any`
{
    const component = emitComponent(each({}));
    expectTypeOf(component.blockParams.default).toEqualTypeOf();
}
// Gives `any` given an invalid iterable (avoiding a cascade of type errors)
{
    const component = emitComponent(each(
    // @ts-expect-error: number is not a valid iterable
    123));
    expectTypeOf(component.blockParams.default).toEqualTypeOf();
}
//# sourceMappingURL=each.test.js.map