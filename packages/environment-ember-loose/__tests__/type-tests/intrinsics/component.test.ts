import { expectTypeOf } from 'expect-type';
import {
  resolve,
  applySplattributes,
  emitComponent,
  Globals,
  NamedArgsMarker,
} from '@glint/environment-ember-loose/-private/dsl';
import Component from '@ember/component';
import { ComponentKeyword } from '@glint/environment-ember-loose/-private/intrinsics/component';
import { WithBoundArgs, ComponentLike } from '@glint/template';

const componentKeyword = resolve({} as ComponentKeyword<LocalRegistry>);

declare function maybe<T>(arg: T): T | undefined;

type LocalRegistry = {
  string: typeof StringComponent;
  parametric: typeof ParametricComponent;
};

class StringComponent extends Component<{
  Element: HTMLFormElement;
  Args: { value: string };
  Blocks: { default?: [string] };
}> {}

const NoopCurriedStringComponent = componentKeyword('string');
const ValueCurriedStringComponent = componentKeyword('string', {
  value: 'hello',
  ...NamedArgsMarker,
});

const MaybeNoopCurriedStringComponent = componentKeyword(maybe('string'));
const MaybeValueCurriedStringComponent = componentKeyword(maybe('string'), {
  value: 'hello',
  ...NamedArgsMarker,
});

// Once value is curried, it should be optional in args
expectTypeOf(ValueCurriedStringComponent).toEqualTypeOf<
  ComponentLike<{
    Element: HTMLFormElement;
    Args: { value?: string };
    Blocks: { default?: [string] };
  }>
>();

// {{component maybeAString}} returns Component | null
expectTypeOf(MaybeNoopCurriedStringComponent).toEqualTypeOf<null | typeof StringComponent>();
expectTypeOf(MaybeValueCurriedStringComponent).toEqualTypeOf<
  null | typeof ValueCurriedStringComponent
>();

// This is also equivalent to this `ComponentWithBoundArgs` shorthand:
expectTypeOf(ValueCurriedStringComponent).toEqualTypeOf<
  WithBoundArgs<typeof ValueCurriedStringComponent, 'value'>
>();

// Invoking the noop-curried component
{
  const component = emitComponent(
    resolve(NoopCurriedStringComponent)({ value: 'hello', ...NamedArgsMarker })
  );

  // Applying attributes/modifiers
  applySplattributes(new HTMLFormElement(), component.element);
}

resolve(NoopCurriedStringComponent)(
  // @ts-expect-error: Invoking the curried component but forgetting `value`
  { ...NamedArgsMarker }
);

resolve(NoopCurriedStringComponent)({
  // @ts-expect-error: Invoking the curried component with an invalid value
  value: 123,
  ...NamedArgsMarker,
});

// Invoking the noop-curried component with a valid block
{
  const component = emitComponent(
    resolve(NoopCurriedStringComponent)({ value: 'hello', ...NamedArgsMarker })
  );

  {
    const [...args] = component.blockParams.default;
    expectTypeOf(args).toEqualTypeOf<[string]>();
  }
}

// Invoking the noop-curried component with an invalid block
{
  const component = emitComponent(
    resolve(NoopCurriedStringComponent)({ value: 'hello', ...NamedArgsMarker })
  );

  // @ts-expect-error: invalid block name
  component.blockParams.asdf;
}

// Invoking the curried-with-value component with no value
emitComponent(resolve(ValueCurriedStringComponent)());

// Invoking the curried-with-value component with a valid value
{
  const component = emitComponent(
    resolve(ValueCurriedStringComponent)({ value: 'hi', ...NamedArgsMarker })
  );
  applySplattributes(new HTMLFormElement(), component.element);
}

emitComponent(
  resolve(ValueCurriedStringComponent)({
    // @ts-expect-error: Invoking the curred-with-value component with an invalid value
    value: 123,
    ...NamedArgsMarker,
  })
);

componentKeyword(StringComponent, {
  // @ts-expect-error: Attempting to curry an arg with the wrong type
  value: 123,
  ...NamedArgsMarker,
});

class ParametricComponent<T> extends Component<{
  Element: HTMLFormElement;
  Args: { values: Array<T>; optional?: string };
  Blocks: { default?: [T, number] };
}> {}

const NoopCurriedParametricComponent = componentKeyword('parametric');

// The only way to fix a type parameter as part of using the component keyword is to
// say ahead of time the type you're trying to bind it as.
const BoundParametricComponent = ParametricComponent as new () => ParametricComponent<string>;

const RequiredValueCurriedParametricComponent = componentKeyword(BoundParametricComponent, {
  values: ['hello'],
  ...NamedArgsMarker,
});

const OptionalValueCurriedParametricComponent = componentKeyword(componentKeyword('parametric'), {
  optional: 'hi',
  ...NamedArgsMarker,
});

// Invoking the noop-curried component with number values
{
  const component = emitComponent(
    resolve(NoopCurriedParametricComponent)({ values: [1, 2, 3], ...NamedArgsMarker })
  );

  {
    const [value] = component.blockParams.default;
    expectTypeOf(value).toEqualTypeOf<number>();
  }
}

// Invoking the noop-curried component with string values
{
  const component = emitComponent(
    resolve(NoopCurriedParametricComponent)({ values: ['hello'], ...NamedArgsMarker })
  );

  {
    const [value] = component.blockParams.default;
    expectTypeOf(value).toEqualTypeOf<string>();
  }

  applySplattributes(new HTMLFormElement(), component.element);
}

emitComponent(
  // @ts-expect-error: expect 1 args but got 0
  resolve(NoopCurriedParametricComponent)()
);

emitComponent(
  resolve(NoopCurriedParametricComponent)({
    // @ts-expect-error: wrong type for `values`
    values: 'hello',
    ...NamedArgsMarker,
  })
);

emitComponent(
  resolve(NoopCurriedParametricComponent)({
    values: [1, 2, 3],
    // @ts-expect-error: extra arg
    extra: 'uh oh',
    ...NamedArgsMarker,
  })
);

// Invoking the curred component with no additional args
{
  const component = emitComponent(resolve(RequiredValueCurriedParametricComponent)());

  {
    const [value] = component.blockParams.default;
    expectTypeOf(value).toEqualTypeOf<string>();
  }
}

// Invoking the curred component and overriding the given arg
{
  const component = emitComponent(
    resolve(RequiredValueCurriedParametricComponent)({ values: ['ok'], ...NamedArgsMarker })
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
    ...NamedArgsMarker,
  })
);

emitComponent(
  resolve(RequiredValueCurriedParametricComponent)({
    // @ts-expect-error: extra arg
    extra: 'bad',
    ...NamedArgsMarker,
  })
);

// Invoking the curried component, supplying missing required args
{
  const component = emitComponent(
    resolve(OptionalValueCurriedParametricComponent)({ values: [1, 2, 3], ...NamedArgsMarker })
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
const DoubleCurriedComponent = componentKeyword(RequiredValueCurriedParametricComponent, {
  optional: 'hi',
  ...NamedArgsMarker,
});

const MaybeDoubleCurriedParametricComponent = componentKeyword(
  maybe(RequiredValueCurriedParametricComponent),
  { optional: 'hi', ...NamedArgsMarker }
);

expectTypeOf(MaybeDoubleCurriedParametricComponent).toEqualTypeOf<
  null | typeof DoubleCurriedComponent
>();

// Invoking the component with no args
{
  const component = emitComponent(resolve(DoubleCurriedComponent)());

  {
    const [value] = component.blockParams.default;
    expectTypeOf(value).toEqualTypeOf<string>();
  }
}

// Invoking the component overriding an arg correctly
emitComponent(resolve(DoubleCurriedComponent)({ values: ['a', 'b'], ...NamedArgsMarker }));

emitComponent(
  resolve(DoubleCurriedComponent)({
    // @ts-expect-error: invalid arg override
    values: [1, 2, 3],
    ...NamedArgsMarker,
  })
);

emitComponent(
  resolve(DoubleCurriedComponent)({
    // @ts-expect-error: unexpected args
    foo: 'bar',
    ...NamedArgsMarker,
  })
);

{
  // This 'real' version of `{{component}}` uses the definition available to downstream consumers,
  // rather than the one above that's tied to our isolated testing registry so we can ensure
  // appropriate global values are available to consumers.
  const realComponentKeyword = resolve(Globals['component']);

  expectTypeOf(realComponentKeyword('input')).toEqualTypeOf(Globals.input);
  expectTypeOf(realComponentKeyword('link-to')).toEqualTypeOf(Globals['link-to']);
  expectTypeOf(realComponentKeyword('textarea')).toEqualTypeOf(Globals['textarea']);
}
