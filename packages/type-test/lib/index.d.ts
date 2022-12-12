import { DirectInvokable, EmptyObject, HasContext } from '@glint/template/-private/integration';
import { Equal, Extends, IsAny, IsNever, IsUnknown } from 'expect-type';
interface UnaryExpectations<T> {
    string: [Equal<T, string>, 'Expected type to be `string`, but got'];
    number: [Equal<T, number>, 'Expected type to be `number`, but got'];
    boolean: [Equal<T, boolean>, 'Expected type to be `boolean`, but got'];
    symbol: [Equal<T, symbol>, 'Expected type to be a `symbol`, but got'];
    any: [IsAny<T>, 'Expected type to be `any`, but got'];
    unknown: [IsUnknown<T>, 'Expected type to be `unknown`, but got'];
    never: [IsNever<T>, 'Expected type to be `never`, but got'];
    null: [Equal<T, null>, 'Expected type to be `null`, but got'];
    undefined: [Equal<T, undefined>, 'Expected type to be `undefined`, but got'];
}
interface BinaryExpectations<T, U> {
    equal: [Equal<T, U>, 'Expected first type to be identical to the second'];
    assignableTo: [Extends<T, U>, 'Expected first type to be assignable to the second'];
}
declare const Expectation: unique symbol;
declare type Expectation<T> = {
    [Expectation]: T;
};
declare type UnaryExpectationKind = keyof UnaryExpectations<any>;
declare type UnaryExpectation<K extends UnaryExpectationKind> = Expectation<K>;
declare type BinaryExpectationKind = keyof BinaryExpectations<any, any>;
declare type BinaryExpectation<K extends BinaryExpectationKind> = Expectation<K>;
declare type UnmetExpectation<M, T> = [M, T];
declare type TypeTestTemplate<T> = abstract new () => HasContext<{
    this: T;
    args: {
        expectTypeOf: typeof expectTypeOf;
        to: typeof to;
    };
    blocks: {};
    element: unknown;
}>;
declare type ExpectTypeOf = DirectInvokable<{
    <T, E extends UnaryExpectationKind>(named: EmptyObject, actual: T, expectation: UnaryExpectation<E>): UnaryExpectations<T>[E] extends [false, infer M] ? UnmetExpectation<M, T> : void;
    <T, E extends BinaryExpectationKind, U>(named: EmptyObject, actual: T, expectation: BinaryExpectation<E>, expected: U): BinaryExpectations<T, U>[E] extends [false, infer M] ? UnmetExpectation<M, [T, U]> : void;
}>;
/**
 * Given a value, an expectation, and potentially a second value as the
 * target of that expectation, confirms whether the type of that value
 * meets the constraints set by the given expectation.
 *
 * ```handlebars
 * {{expectTypeOf 123 to.beNumber}}
 * {{expectTypeOf 123 to.equalTypeOf (add 1 2)}}
 * ```
 */
export declare const expectTypeOf: ExpectTypeOf;
/**
 * Provides a set of possible expectations to apply against the
 * type of a value passed to `{{expectTypeOf}}`.
 */
export declare const to: {
    equalTypeOf: BinaryExpectation<'equal'>;
    beAssignableToTypeOf: BinaryExpectation<'assignableTo'>;
    beString: UnaryExpectation<'string'>;
    beNumber: UnaryExpectation<'number'>;
    beBoolean: UnaryExpectation<'boolean'>;
    beSymbol: UnaryExpectation<'symbol'>;
    beAny: UnaryExpectation<'any'>;
    beUnknown: UnaryExpectation<'unknown'>;
    beNever: UnaryExpectation<'never'>;
    beNull: UnaryExpectation<'null'>;
    beUndefined: UnaryExpectation<'undefined'>;
};
/**
 * Given a loose-mode template (e.g. as defined using `hbs`), this
 * wrapper sets the context of that template appropriately. It receives
 * the `expectTypeOf` and `to` imports from this module as args, and
 * optionally takes an initial `context` parameter that determines the
 * type of the `{{this}}` value in the template.
 *
 * ```typescript
 * typeTest(
 *   { message: 'hello' },
 *   hbs`
 *     {{@expectTypeOf this.message @to.beString}}
 *   `
 * );
 * ```
 */
export declare function typeTest<T>(context: T, template: TypeTestTemplate<T>): void;
export declare function typeTest(template: TypeTestTemplate<null>): void;
export declare function typeTest(...args: Array<unknown>): void;
export {};
