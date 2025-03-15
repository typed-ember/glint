import Helper, { helper } from '@ember/component/helper';
import { resolve, NamedArgsMarker } from '@glint/environment-ember-loose/-private/dsl';
import { expectTypeOf } from 'expect-type';
// Functional helper: fixed signature params
{
    let definition = helper(([name], { age }) => `${name}: ${age}`);
    let info = resolve(definition);
    expectTypeOf(info).toEqualTypeOf();
    info(
    // @ts-expect-error: missing named arg
    {}, 'Tom');
    info('Tom', {
        age: 123,
        // @ts-expect-error: extra named arg
        hello: true,
        ...NamedArgsMarker,
    });
    // @ts-expect-error: missing positional arg
    info({ age: 123, ...NamedArgsMarker });
    info('Tom', 'Ster', 
    // @ts-expect-error: extra positional arg
    { age: 123, ...NamedArgsMarker });
    expectTypeOf(info('Tom', { age: 123, ...NamedArgsMarker })).toEqualTypeOf();
}
// Functional helper: generic positional params
{
    let definition = helper(([a, b]) => a || b);
    let or = resolve(definition);
    // Using `toMatch` rather than `toEqual` because helper resolution (currently)
    // uses a special `EmptyObject` type to represent empty named args.
    expectTypeOf(or).toMatchTypeOf();
    or('a', 'b', {
        // @ts-expect-error: extra named arg
        hello: true,
        ...NamedArgsMarker,
    });
    // This is perhaps unexpected, but this will typecheck with the named args acting
    // as the second positional argument.
    expectTypeOf(or('a', { foo: 'hi', ...NamedArgsMarker })).toEqualTypeOf();
    or('a', 'b', 
    // @ts-expect-error: extra positional arg
    'c');
    expectTypeOf(or('a', 'b')).toEqualTypeOf();
    expectTypeOf(or('a', true)).toEqualTypeOf();
    expectTypeOf(or(false, true)).toEqualTypeOf();
}
// Functional helper: generic named params
{
    let definition = helper((_, { value, count }) => {
        return Array.from({ length: count ?? 2 }, () => value);
    });
    let repeat = resolve(definition);
    expectTypeOf(repeat).toEqualTypeOf();
    // @ts-expect-error: extra positional arg
    repeat(123, { word: 'hi', ...NamedArgsMarker });
    // @ts-expect-error: missing required named arg
    repeat({ count: 3, ...NamedArgsMarker });
    repeat({
        // @ts-expect-error: extra named arg
        word: 'hello',
        foo: true,
        ...NamedArgsMarker,
    });
    expectTypeOf(repeat({ value: 'hi', ...NamedArgsMarker })).toEqualTypeOf();
    expectTypeOf(repeat({ value: 123, count: 3, ...NamedArgsMarker })).toEqualTypeOf();
}
// Class-based helper: named args
{
    class RepeatHelper extends Helper {
        compute(_, { value, count }) {
            return Array.from({ length: count ?? 2 }, () => value);
        }
    }
    let repeat = resolve(RepeatHelper);
    expectTypeOf(repeat).toEqualTypeOf();
    repeat(123, 
    // @ts-expect-error: extra positional arg
    { word: 'hi', ...NamedArgsMarker });
    // @ts-expect-error: missing required named arg
    repeat({ count: 3, ...NamedArgsMarker });
    repeat({
        value: 'hello',
        // @ts-expect-error: extra named arg
        foo: true,
        ...NamedArgsMarker,
    });
    expectTypeOf(repeat({ value: 'hi', ...NamedArgsMarker })).toEqualTypeOf();
    expectTypeOf(repeat({ value: 123, count: 3, ...NamedArgsMarker })).toEqualTypeOf();
}
// Class-based helper: positional args
{
    class RepeatHelper extends Helper {
        compute([value, count]) {
            return Array.from({ length: count ?? 2 }, () => value);
        }
    }
    let repeat = resolve(RepeatHelper);
    expectTypeOf(repeat).toEqualTypeOf();
    repeat('hello', 
    // @ts-expect-error: unexpected named args
    { word: 'hi', ...NamedArgsMarker });
    repeat('hello', 123, 
    // @ts-expect-error: extra positional arg in named args spot
    'hi');
    expectTypeOf(repeat('hi')).toEqualTypeOf();
    expectTypeOf(repeat(123, 3)).toEqualTypeOf();
}
// Class-based helpers can return undefined
{
    class MaybeStringHelper extends Helper {
        compute() {
            if (Math.random() > 0.5) {
                return 'ok';
            }
        }
    }
    let maybeString = resolve(MaybeStringHelper);
    expectTypeOf(maybeString).toEqualTypeOf();
}
// Helpers are `HelperLike`
{
    class MyHelper extends Helper {
    }
    const myHelper = helper(() => []);
    expectTypeOf(MyHelper).toMatchTypeOf();
    expectTypeOf(myHelper).toMatchTypeOf();
}
// Bare-function helpers
{
    let positionalOnlyConcrete = resolve((a, b) => a + b);
    expectTypeOf(positionalOnlyConcrete).toEqualTypeOf();
    expectTypeOf(positionalOnlyConcrete(1, 2)).toBeNumber();
    let positionalOnlyGeneric = resolve((a, b) => [a, b]);
    expectTypeOf(positionalOnlyGeneric).toEqualTypeOf();
    expectTypeOf(positionalOnlyGeneric('hi', true)).toEqualTypeOf();
    expectTypeOf(positionalOnlyGeneric(123, Symbol())).toEqualTypeOf();
    let mixedConcrete = resolve((a, b, named) => named.fallback);
    expectTypeOf(mixedConcrete).toEqualTypeOf();
    expectTypeOf(mixedConcrete(1, 2, { fallback: 123 })).toBeNumber();
    let mixedGenericNamed = resolve((a, b, named) => a + b || named.fallback);
    expectTypeOf(mixedGenericNamed).toEqualTypeOf();
    expectTypeOf(mixedGenericNamed(1, 2, { fallback: 'hi' })).toEqualTypeOf();
    expectTypeOf(mixedGenericNamed(1, 2, { fallback: 3 })).toBeNumber();
    let mixedGenericPositional = resolve((a, b, named) => a || b || named.fallback);
    expectTypeOf(mixedGenericPositional).toEqualTypeOf();
    expectTypeOf(mixedGenericPositional('a', 'b', { fallback: 'hi' })).toBeString();
    expectTypeOf(mixedGenericPositional(1, 2, { fallback: 'hi' })).toEqualTypeOf();
    mixedGenericPositional('a', 
    // @ts-expect-error: inconsistent T
    123, { fallback: 'hi' });
    let mixedGeneric = resolve((a, b, named) => [a, b, named.c]);
    expectTypeOf(mixedGeneric).toEqualTypeOf();
    expectTypeOf(mixedGeneric(123, false, { c: 'hi' })).toEqualTypeOf();
    let namedOnlyConcrete = resolve((named) => named.name);
    expectTypeOf(namedOnlyConcrete).toEqualTypeOf();
    expectTypeOf(namedOnlyConcrete({ age: 100, name: 'Alex' })).toBeString();
    let namedOnlyGeneric = resolve((named) => [named.t, named.u]);
    expectTypeOf(namedOnlyGeneric).toEqualTypeOf();
    expectTypeOf(namedOnlyGeneric({ t: 'hi', u: 123 })).toEqualTypeOf();
    let optionalNamed = resolve((a, named) => [a, named?.cool]);
    expectTypeOf(optionalNamed).toEqualTypeOf();
    expectTypeOf(optionalNamed(123)).toEqualTypeOf();
    expectTypeOf(optionalNamed(123, { cool: true, ...NamedArgsMarker })).toEqualTypeOf();
    let optionalBoth = resolve((a, b, named) => [
        a,
        b,
        named?.foo,
    ]);
    expectTypeOf(optionalBoth).toEqualTypeOf();
    expectTypeOf(optionalBoth('hi')).toEqualTypeOf();
    expectTypeOf(optionalBoth('hi', 123)).toEqualTypeOf();
    expectTypeOf(optionalBoth('hi', undefined, { foo: true, ...NamedArgsMarker })).toEqualTypeOf();
    expectTypeOf(optionalBoth('hi', 123, { foo: true, ...NamedArgsMarker })).toEqualTypeOf();
    let namedArgsInterface = resolve((pos, options) => {
        console.log(pos, options);
    });
    expectTypeOf(namedArgsInterface).toEqualTypeOf();
    let namedArgsType = resolve((pos, named) => {
        console.log(pos, named);
    });
    expectTypeOf(namedArgsType).toEqualTypeOf();
    let narrowsFirstArg = resolve((arg, key) => !!key);
    expectTypeOf(narrowsFirstArg).toEqualTypeOf();
    let narrowsFirstArgTestValue;
    if (narrowsFirstArg(narrowsFirstArgTestValue, 'key')) {
        expectTypeOf(narrowsFirstArgTestValue.key).toBeNumber();
    }
    let allOptional = resolve((a, b) => `${a}${b?.foo}`);
    expectTypeOf(allOptional).toEqualTypeOf();
}
//# sourceMappingURL=helper.test.js.map