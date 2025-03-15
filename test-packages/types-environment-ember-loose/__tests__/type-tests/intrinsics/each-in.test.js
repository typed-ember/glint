import { expectTypeOf } from 'expect-type';
import { emitComponent, Globals, NamedArgsMarker, resolve, } from '@glint/environment-ember-loose/-private/dsl';
let eachIn = resolve(Globals['each-in']);
{
    const component = emitComponent(eachIn({ a: 5, b: 3 }));
    {
        const [key, value] = component.blockParams.default;
        expectTypeOf(key).toEqualTypeOf();
        expectTypeOf(value).toEqualTypeOf();
    }
}
// Only gives string keys
{
    const b = Symbol('b');
    const value = { a: 'hi', [b]: 123 };
    const component = emitComponent(eachIn(value));
    {
        const [key, value] = component.blockParams.default;
        // {{each-in}} internally uses `Object.keys`, so only string keys are included
        expectTypeOf(key).toEqualTypeOf();
        expectTypeOf(value).toEqualTypeOf();
    }
}
{
    const component = emitComponent(eachIn(maybeVal));
    {
        const [key, value] = component.blockParams.default;
        expectTypeOf(key).toEqualTypeOf();
        expectTypeOf(value).toEqualTypeOf();
    }
    {
        const [...args] = component.blockParams.else;
        expectTypeOf(args).toEqualTypeOf();
    }
}
{
    const component = emitComponent(eachIn(maybeMapVal));
    {
        const [key, value] = component.blockParams.default;
        expectTypeOf(key).toEqualTypeOf();
        expectTypeOf(value).toEqualTypeOf();
    }
    {
        const [...args] = component.blockParams.else;
        expectTypeOf(args).toEqualTypeOf();
    }
}
// Can render else when undefined, null, or empty.
{
    const component = emitComponent(eachIn(undefined));
    {
        const [key, value] = component.blockParams.default;
        // This won't get called when no value, but gets default key type
        expectTypeOf(key).toEqualTypeOf();
        expectTypeOf(value).toEqualTypeOf();
    }
    {
        const [...args] = component.blockParams.else;
        expectTypeOf(args).toEqualTypeOf();
    }
}
{
    const component = emitComponent(eachIn(null));
    {
        const [key, value] = component.blockParams.default;
        // This won't get called when no value, but gets default key type
        expectTypeOf(key).toEqualTypeOf();
        expectTypeOf(value).toEqualTypeOf();
    }
    {
        const [...args] = component.blockParams.else;
        expectTypeOf(args).toEqualTypeOf();
    }
}
{
    const component = emitComponent(eachIn({}));
    {
        const [key, value] = component.blockParams.default;
        // This won't get called when no value
        expectTypeOf(key).toEqualTypeOf();
        expectTypeOf(value).toEqualTypeOf();
    }
    {
        const [...args] = component.blockParams.else;
        expectTypeOf(args).toEqualTypeOf();
    }
}
// Accept a `key` string
{
    const component = emitComponent(eachIn({ a: 5, b: 3 }, { key: 'id', ...NamedArgsMarker }));
    {
        const [key, value] = component.blockParams.default;
        expectTypeOf(key).toEqualTypeOf();
        expectTypeOf(value).toEqualTypeOf();
    }
}
// Accepts a Map
{
    const component = emitComponent(eachIn(new Map([
        ['a', 5],
        ['b', 4],
    ]), { key: 'id', ...NamedArgsMarker }));
    {
        const [key, value] = component.blockParams.default;
        expectTypeOf(key).toEqualTypeOf();
        expectTypeOf(value).toEqualTypeOf();
    }
}
// Accepts a custom iterable
{
    class CustomMap {
        [Symbol.iterator]() {
            throw new Error();
        }
    }
    const component = emitComponent(eachIn(new CustomMap(), { key: 'id', ...NamedArgsMarker }));
    {
        const [key, value] = component.blockParams.default;
        expectTypeOf(key).toEqualTypeOf();
        expectTypeOf(value).toEqualTypeOf();
    }
}
//# sourceMappingURL=each-in.test.js.map