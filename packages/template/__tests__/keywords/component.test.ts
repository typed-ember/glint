import { expectTypeOf } from 'expect-type';
import { resolve, invokeBlock } from '@glint/template';
import { ComponentKeyword } from '@glint/template/-private/keywords';
import TestComponent from '../test-component';

const componentKeyword = resolve({} as ComponentKeyword);

class StringComponent extends TestComponent<{ value: string }, { default?: [string] }> {}

const NoopCurriedStringComponent = componentKeyword({}, StringComponent);
const ValueCurriedStringComponent = componentKeyword({ value: 'hello' }, StringComponent);

// Invoking the noop-curried component
invokeBlock(resolve(NoopCurriedStringComponent)({ value: 'hello' }), {});

// @ts-expect-error: Invoking the curried component but forgetting `value`
resolve(NoopCurriedStringComponent)({});

// @ts-expect-error: Invoking the curried component with an invalid value
resolve(NoopCurriedStringComponent)({ value: 123 });

// Invoking the noop-curried component with a valid block
invokeBlock(resolve(NoopCurriedStringComponent)({ value: 'hello' }), {
  default(...args) {
    expectTypeOf(args).toEqualTypeOf<[string]>();
  },
});

// Invoking the noop-curried component with an invalid block
invokeBlock(resolve(NoopCurriedStringComponent)({ value: 'hello' }), {
  default() {
    /* nothing */
  },
  // @ts-expect-error
  asdf() {
    /* nothing */
  },
});

// Invoking the curried-with-value component with no value
invokeBlock(resolve(ValueCurriedStringComponent)({}), {});

// Invoking the curried-with-value component with a valid value
invokeBlock(resolve(ValueCurriedStringComponent)({ value: 'hi' }), {});

// @ts-expect-error: Invoking the curred-with-value component with an invalid value
invokeBlock(resolve(ValueCurriedStringComponent)({ value: 123 }), {});

// @ts-expect-error: Attempting to curry a nonexistent arg
componentKeyword({ foo: true }, StringComponent);

// @ts-expect-error: Attempting to curry an arg with the wrong type
componentKeyword({ value: 123 }, StringComponent);

class ParametricComponent<T> extends TestComponent<
  { values: Array<T>; optional?: string },
  { default?: [T, number] }
> {}

const NoopCurriedParametricComponent = componentKeyword({}, ParametricComponent);

// The only way to fix a type parameter as part of using the component keyword is to
// say ahead of time the type you're trying to bind it as.
const BoundParametricComponent = ParametricComponent as new () => ParametricComponent<string>;

const RequiredValueCurriedParametricComponent = componentKeyword(
  { values: ['hello'] },
  BoundParametricComponent
);

const OptionalValueCurriedParametricComponent = componentKeyword(
  { optional: 'hi' },
  ParametricComponent
);

// Invoking the noop-curried component with number values
invokeBlock(resolve(NoopCurriedParametricComponent)({ values: [1, 2, 3] }), {
  default(value) {
    expectTypeOf(value).toEqualTypeOf<number>();
  },
});

// Invoking the noop-curried component with string values
invokeBlock(resolve(NoopCurriedParametricComponent)({ values: ['hello'] }), {
  default(value) {
    expectTypeOf(value).toEqualTypeOf<string>();
  },
});

invokeBlock(
  resolve(NoopCurriedParametricComponent)(
    // @ts-expect-error: missing required arg `values`
    {}
  ),
  {}
);

invokeBlock(
  resolve(NoopCurriedParametricComponent)(
    // @ts-expect-error: wrong type for `values`
    { values: 'hello' }
  ),
  {}
);

invokeBlock(
  resolve(NoopCurriedParametricComponent)({
    values: [1, 2, 3],
    // @ts-expect-error: extra arg
    extra: 'uh oh',
  }),
  {}
);

// Invoking the curred component with no additional args
invokeBlock(resolve(RequiredValueCurriedParametricComponent)({}), {
  default(value) {
    expectTypeOf(value).toEqualTypeOf<string>();
  },
});

// Invoking the curred component and overriding the given arg
invokeBlock(resolve(RequiredValueCurriedParametricComponent)({ values: ['ok'] }), {
  default(value) {
    expectTypeOf(value).toEqualTypeOf<string>();
  },
});

invokeBlock(
  resolve(RequiredValueCurriedParametricComponent)({
    // @ts-expect-error: wrong type for arg override
    values: [1, 2, 3],
  }),
  {}
);

invokeBlock(
  resolve(RequiredValueCurriedParametricComponent)({
    // @ts-expect-error: extra arg
    extra: 'bad',
  }),
  {}
);

// Invoking the curried component, supplying missing required args
invokeBlock(resolve(OptionalValueCurriedParametricComponent)({ values: [1, 2, 3] }), {
  default(value) {
    expectTypeOf(value).toEqualTypeOf<number>();
  },
});

invokeBlock(
  resolve(OptionalValueCurriedParametricComponent)(
    // @ts-expect-error: missing required arg `values`
    {}
  ),
  {}
);

// {{component (component BoundParametricComponent values=(array "hello")) optional="hi"}}
const DoubleCurriedComponent = componentKeyword(
  { optional: 'hi' },
  RequiredValueCurriedParametricComponent
);

// Invoking the component with no args
invokeBlock(resolve(DoubleCurriedComponent)({}), {
  default(value) {
    expectTypeOf(value).toEqualTypeOf<string>();
  },
});

// Invoking the component overriding an arg correctly
invokeBlock(resolve(DoubleCurriedComponent)({ values: ['a', 'b'] }), {});

invokeBlock(
  resolve(DoubleCurriedComponent)({
    // @ts-expect-error: invalid arg override
    values: [1, 2, 3],
  }),
  {}
);

invokeBlock(
  resolve(DoubleCurriedComponent)({
    // @ts-expect-error: unexpected args
    foo: 'bar',
  }),
  {}
);
