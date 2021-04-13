import { expectTypeOf } from 'expect-type';
import { emitComponent, resolve } from '../../-private/dsl';
import { ComponentKeyword } from '../../-private/keywords';
import TestComponent from '../test-component';

const componentKeyword = resolve({} as ComponentKeyword);

class StringComponent extends TestComponent<{
  Args: { value: string };
  Yields: { default?: [string] };
}> {}

const NoopCurriedStringComponent = componentKeyword({}, StringComponent);
const ValueCurriedStringComponent = componentKeyword({ value: 'hello' }, StringComponent);

// Invoking the noop-curried component
emitComponent(resolve(NoopCurriedStringComponent)({ value: 'hello' }));

// @ts-expect-error: Invoking the curried component but forgetting `value`
resolve(NoopCurriedStringComponent)({});

// @ts-expect-error: Invoking the curried component with an invalid value
resolve(NoopCurriedStringComponent)({ value: 123 });

// Invoking the noop-curried component with a valid block
{
  const component = emitComponent(resolve(NoopCurriedStringComponent)({ value: 'hello' }));

  {
    const [...args] = component.blockParams.default;
    expectTypeOf(args).toEqualTypeOf<[string]>();
  }
}

// Invoking the noop-curried component with an invalid block
{
  const component = emitComponent(resolve(NoopCurriedStringComponent)({ value: 'hello' }));

  {
    // @ts-expect-error: invalid block name
    component.blockParams.asdf;
  }
}

// Invoking the curried-with-value component with no value
emitComponent(resolve(ValueCurriedStringComponent)({}));

// Invoking the curried-with-value component with a valid value
emitComponent(resolve(ValueCurriedStringComponent)({ value: 'hi' }));

emitComponent(
  resolve(ValueCurriedStringComponent)({
    // @ts-expect-error: Invoking the curred-with-value component with an invalid value
    value: 123,
  })
);

componentKeyword(
  {
    // @ts-expect-error: Attempting to curry a nonexistent arg
    foo: true,
  },
  StringComponent
);

componentKeyword(
  {
    // @ts-expect-error: Attempting to curry an arg with the wrong type
    value: 123,
  },
  StringComponent
);

class ParametricComponent<T> extends TestComponent<{
  Args: { values: Array<T>; optional?: string };
  Yields: { default?: [T, number] };
}> {}

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
{
  const component = emitComponent(resolve(NoopCurriedParametricComponent)({ values: [1, 2, 3] }));

  {
    const [value] = component.blockParams.default;
    expectTypeOf(value).toEqualTypeOf<number>();
  }
}

// Invoking the noop-curried component with string values
{
  const component = emitComponent(resolve(NoopCurriedParametricComponent)({ values: ['hello'] }));

  {
    const [value] = component.blockParams.default;
    expectTypeOf(value).toEqualTypeOf<string>();
  }
}

emitComponent(
  resolve(NoopCurriedParametricComponent)(
    // @ts-expect-error: missing required arg `values`
    {}
  )
);

emitComponent(
  resolve(NoopCurriedParametricComponent)(
    // @ts-expect-error: wrong type for `values`
    { values: 'hello' }
  )
);

emitComponent(
  resolve(NoopCurriedParametricComponent)({
    values: [1, 2, 3],
    // @ts-expect-error: extra arg
    extra: 'uh oh',
  })
);

// Invoking the curred component with no additional args
{
  const component = emitComponent(resolve(RequiredValueCurriedParametricComponent)({}));

  {
    const [value] = component.blockParams.default;
    expectTypeOf(value).toEqualTypeOf<string>();
  }
}

// Invoking the curred component and overriding the given arg
{
  const component = emitComponent(
    resolve(RequiredValueCurriedParametricComponent)({ values: ['ok'] })
  );

  {
    const [value] = component.blockParams.default;
    expectTypeOf(value).toEqualTypeOf<string>();
  }
}

emitComponent(
  resolve(RequiredValueCurriedParametricComponent)({
    // @ts-expect-error: wrong type for arg override
    values: [1, 2, 3],
  })
);

emitComponent(
  resolve(RequiredValueCurriedParametricComponent)({
    // @ts-expect-error: extra arg
    extra: 'bad',
  })
);

// Invoking the curried component, supplying missing required args
{
  const component = emitComponent(
    resolve(OptionalValueCurriedParametricComponent)({ values: [1, 2, 3] })
  );

  {
    const [value] = component.blockParams.default;
    expectTypeOf(value).toEqualTypeOf<number>();
  }
}

emitComponent(
  resolve(OptionalValueCurriedParametricComponent)(
    // @ts-expect-error: missing required arg `values`
    {}
  )
);

// {{component (component BoundParametricComponent values=(array "hello")) optional="hi"}}
const DoubleCurriedComponent = componentKeyword(
  { optional: 'hi' },
  RequiredValueCurriedParametricComponent
);

// Invoking the component with no args
{
  const component = emitComponent(resolve(DoubleCurriedComponent)({}));

  {
    const [value] = component.blockParams.default;
    expectTypeOf(value).toEqualTypeOf<string>();
  }
}

// Invoking the component overriding an arg correctly
emitComponent(resolve(DoubleCurriedComponent)({ values: ['a', 'b'] }));

emitComponent(
  resolve(DoubleCurriedComponent)({
    // @ts-expect-error: invalid arg override
    values: [1, 2, 3],
  })
);

emitComponent(
  resolve(DoubleCurriedComponent)({
    // @ts-expect-error: unexpected args
    foo: 'bar',
  })
);
