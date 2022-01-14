import { expectTypeOf } from 'expect-type';
import {
  resolve,
  applySplattributes,
  emitComponent,
  Globals,
} from '@glint/environment-ember-loose/-private/dsl';
import Component from '@glint/environment-ember-loose/ember-component';
import { ComponentKeyword } from '@glint/environment-ember-loose/-private/intrinsics/component';
import { ComponentWithBoundArgs, ComponentLike } from '@glint/environment-ember-loose';

const componentKeyword = resolve({} as ComponentKeyword<LocalRegistry>);

declare function maybe<T>(arg: T): T | undefined;

type LocalRegistry = {
  string: typeof StringComponent;
  parametric: typeof ParametricComponent;
};

class StringComponent extends Component<{
  Element: HTMLFormElement;
  Args: { value: string };
  Yields: { default?: [string] };
}> {}

const NoopCurriedStringComponent = componentKeyword({}, 'string');
const ValueCurriedStringComponent = componentKeyword({ value: 'hello' }, 'string');

const MaybeNoopCurriedStringComponent = componentKeyword({}, maybe('string'));
const MaybeValueCurriedStringComponent = componentKeyword({ value: 'hello' }, maybe('string'));

// Once value is curried, it should be optional in args
expectTypeOf(ValueCurriedStringComponent).toEqualTypeOf<
  ComponentLike<{
    Element: HTMLFormElement;
    Args: { value?: string };
    Yields: { default?: [string] };
  }>
>();

// {{component maybeAString}} returns Component | null
expectTypeOf(MaybeNoopCurriedStringComponent).toEqualTypeOf<null | typeof StringComponent>();
expectTypeOf(MaybeValueCurriedStringComponent).toEqualTypeOf<
  null | typeof ValueCurriedStringComponent
>();

// This is also equivalent to this `ComponentWithBoundArgs` shorthand:
expectTypeOf(ValueCurriedStringComponent).toEqualTypeOf<
  ComponentWithBoundArgs<typeof ValueCurriedStringComponent, 'value'>
>();

// Invoking the noop-curried component
{
  const component = emitComponent(resolve(NoopCurriedStringComponent)({ value: 'hello' }));

  // Applying attributes/modifiers
  applySplattributes(new HTMLFormElement(), component.element);
}

resolve(NoopCurriedStringComponent)(
  // @ts-expect-error: Invoking the curried component but forgetting `value`
  {}
);

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

  // @ts-expect-error: invalid block name
  component.blockParams.asdf;
}

// Invoking the curried-with-value component with no value
emitComponent(resolve(ValueCurriedStringComponent)({}));

// Invoking the curried-with-value component with a valid value
{
  const component = emitComponent(resolve(ValueCurriedStringComponent)({ value: 'hi' }));
  applySplattributes(new HTMLFormElement(), component.element);
}

emitComponent(
  resolve(ValueCurriedStringComponent)({
    // @ts-expect-error: Invoking the curred-with-value component with an invalid value
    value: 123,
  })
);

// @ts-expect-error: Attempting to curry a nonexistent arg
componentKeyword({ foo: true }, StringComponent);

// @ts-expect-error: Attempting to curry an arg with the wrong type
componentKeyword({ value: 123 }, StringComponent);

class ParametricComponent<T> extends Component<{
  Element: HTMLFormElement;
  Args: { values: Array<T>; optional?: string };
  Yields: { default?: [T, number] };
}> {}

const NoopCurriedParametricComponent = componentKeyword({}, 'parametric');

// The only way to fix a type parameter as part of using the component keyword is to
// say ahead of time the type you're trying to bind it as.
const BoundParametricComponent = ParametricComponent as new () => ParametricComponent<string>;

const RequiredValueCurriedParametricComponent = componentKeyword(
  { values: ['hello'] },
  BoundParametricComponent
);

const OptionalValueCurriedParametricComponent = componentKeyword(
  { optional: 'hi' },
  componentKeyword({}, 'parametric')
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

  applySplattributes(new HTMLFormElement(), component.element);
}

emitComponent(
  resolve(NoopCurriedParametricComponent)(
    // @ts-expect-error: missing required arg `values`
    {}
  )
);

emitComponent(
  resolve(NoopCurriedParametricComponent)({
    // @ts-expect-error: wrong type for `values`
    values: 'hello',
  })
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

const MaybeDoubleCurriedParametricComponent = componentKeyword(
  { optional: 'hi' },
  maybe(RequiredValueCurriedParametricComponent)
);

expectTypeOf(MaybeDoubleCurriedParametricComponent).toEqualTypeOf<
  null | typeof DoubleCurriedComponent
>();

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

{
  // This 'real' version of `{{component}}` uses the definition available to downstream consumers,
  // rather than the one above that's tied to our isolated testing registry so we can ensure
  // appropriate global values are available to consumers.
  const realComponentKeyword = resolve(Globals['component']);

  expectTypeOf(realComponentKeyword({}, 'input')).toEqualTypeOf(Globals.input);
  expectTypeOf(realComponentKeyword({}, 'link-to')).toEqualTypeOf(Globals['link-to']);
  expectTypeOf(realComponentKeyword({}, 'textarea')).toEqualTypeOf(Globals['textarea']);
}
