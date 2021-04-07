import { expectTypeOf } from 'expect-type';
import { emitComponent, bindBlocks, resolve } from '../../-private/dsl';
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
emitComponent(resolve(NoopCurriedStringComponent)({ value: 'hello' }), (component) => {
  bindBlocks(component.blockParams, {});
});

// @ts-expect-error: Invoking the curried component but forgetting `value`
resolve(NoopCurriedStringComponent)({});

// @ts-expect-error: Invoking the curried component with an invalid value
resolve(NoopCurriedStringComponent)({ value: 123 });

// Invoking the noop-curried component with a valid block
emitComponent(resolve(NoopCurriedStringComponent)({ value: 'hello' }), (component) => {
  bindBlocks(component.blockParams, {
    default(...args) {
      expectTypeOf(args).toEqualTypeOf<[string]>();
    },
  });
});

// Invoking the noop-curried component with an invalid block
emitComponent(resolve(NoopCurriedStringComponent)({ value: 'hello' }), (component) => {
  bindBlocks(component.blockParams, {
    default() {
      /* nothing */
    },
    // @ts-expect-error: invalid block name
    asdf() {
      /* nothing */
    },
  });
});

// Invoking the curried-with-value component with no value
emitComponent(resolve(ValueCurriedStringComponent)({}), (component) => {
  bindBlocks(component.blockParams, {});
});

// Invoking the curried-with-value component with a valid value
emitComponent(resolve(ValueCurriedStringComponent)({ value: 'hi' }), (component) => {
  bindBlocks(component.blockParams, {});
});

emitComponent(
  resolve(ValueCurriedStringComponent)({
    // @ts-expect-error: Invoking the curred-with-value component with an invalid value
    value: 123,
  }),
  (component) => {
    bindBlocks(component.blockParams, {});
  }
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
emitComponent(resolve(NoopCurriedParametricComponent)({ values: [1, 2, 3] }), (component) => {
  bindBlocks(component.blockParams, {
    default(value) {
      expectTypeOf(value).toEqualTypeOf<number>();
    },
  });
});

// Invoking the noop-curried component with string values
emitComponent(resolve(NoopCurriedParametricComponent)({ values: ['hello'] }), (component) => {
  bindBlocks(component.blockParams, {
    default(value) {
      expectTypeOf(value).toEqualTypeOf<string>();
    },
  });
});

emitComponent(
  resolve(NoopCurriedParametricComponent)(
    // @ts-expect-error: missing required arg `values`
    {}
  ),
  (component) => bindBlocks(component.blockParams, {})
);

emitComponent(
  resolve(NoopCurriedParametricComponent)(
    // @ts-expect-error: wrong type for `values`
    { values: 'hello' }
  ),
  (component) => bindBlocks(component.blockParams, {})
);

emitComponent(
  resolve(NoopCurriedParametricComponent)({
    values: [1, 2, 3],
    // @ts-expect-error: extra arg
    extra: 'uh oh',
  }),
  (component) => bindBlocks(component.blockParams, {})
);

// Invoking the curred component with no additional args
emitComponent(resolve(RequiredValueCurriedParametricComponent)({}), (component) => {
  bindBlocks(component.blockParams, {
    default(value) {
      expectTypeOf(value).toEqualTypeOf<string>();
    },
  });
});

// Invoking the curred component and overriding the given arg
emitComponent(resolve(RequiredValueCurriedParametricComponent)({ values: ['ok'] }), (component) => {
  bindBlocks(component.blockParams, {
    default(value) {
      expectTypeOf(value).toEqualTypeOf<string>();
    },
  });
});

emitComponent(
  resolve(RequiredValueCurriedParametricComponent)({
    // @ts-expect-error: wrong type for arg override
    values: [1, 2, 3],
  }),
  (component) => bindBlocks(component.blockParams, {})
);

emitComponent(
  resolve(RequiredValueCurriedParametricComponent)({
    // @ts-expect-error: extra arg
    extra: 'bad',
  }),
  (component) => bindBlocks(component.blockParams, {})
);

// Invoking the curried component, supplying missing required args
emitComponent(
  resolve(OptionalValueCurriedParametricComponent)({ values: [1, 2, 3] }),
  (component) => {
    bindBlocks(component.blockParams, {
      default(value) {
        expectTypeOf(value).toEqualTypeOf<number>();
      },
    });
  }
);

emitComponent(
  resolve(OptionalValueCurriedParametricComponent)(
    // @ts-expect-error: missing required arg `values`
    {}
  ),
  (component) => bindBlocks(component.blockParams, {})
);

// {{component (component BoundParametricComponent values=(array "hello")) optional="hi"}}
const DoubleCurriedComponent = componentKeyword(
  { optional: 'hi' },
  RequiredValueCurriedParametricComponent
);

// Invoking the component with no args
emitComponent(resolve(DoubleCurriedComponent)({}), (component) => {
  bindBlocks(component.blockParams, {
    default(value) {
      expectTypeOf(value).toEqualTypeOf<string>();
    },
  });
});

// Invoking the component overriding an arg correctly
emitComponent(resolve(DoubleCurriedComponent)({ values: ['a', 'b'] }), (component) => {
  bindBlocks(component.blockParams, {});
});

emitComponent(
  resolve(DoubleCurriedComponent)({
    // @ts-expect-error: invalid arg override
    values: [1, 2, 3],
  }),
  (component) => bindBlocks(component.blockParams, {})
);

emitComponent(
  resolve(DoubleCurriedComponent)({
    // @ts-expect-error: unexpected args
    foo: 'bar',
  }),
  (component) => bindBlocks(component.blockParams, {})
);
