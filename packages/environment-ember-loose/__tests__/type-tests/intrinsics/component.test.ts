import Component from '@ember/component';
import { hbs } from 'ember-cli-htmlbars';
import { typeTest } from '@glint/type-test';
import { WithBoundArgs, ModifierLike } from '@glint/template';

// String-based lookups
typeTest(
  {},
  hbs`
    {{#let (component 'input') as |BoundInput|}}
      <BoundInput @value="hello" />

      {{! @glint-expect-error: wrong arg type}}
      <BoundInput @value={{array 1 2 3}} />
    {{/let}}
  `
);

declare const formModifier: ModifierLike<{
  Element: HTMLFormElement;
}>;

class StringComponent extends Component<{
  Element: HTMLFormElement;
  Args: { value: string };
  Blocks: { default: [string] };
}> {}

// Simple no-op binding
typeTest(
  { StringComponent, formModifier },
  hbs`
    {{#let (component this.StringComponent) as |NoopCurriedStringComponent|}}
      <NoopCurriedStringComponent @value="hi" {{this.formModifier}} />

      {{! @glint-expect-error: missing required arg }}
      <NoopCurriedStringComponent />

      <NoopCurriedStringComponent @value="ok" {{this.formModifier}} as |value|>
        {{@expectTypeOf value @to.beString}}
      </NoopCurriedStringComponent>
    {{/let}}
  `
);

// Nullable in, nullable out
typeTest(
  { StringComponent: StringComponent as typeof StringComponent | null },
  hbs`
    {{#let (component this.StringComponent) as |NoopCurriedStringComponent|}}
      <NoopCurriedStringComponent @value="hi" />

      {{@expectTypeOf null @to.beAssignableToTypeOf NoopCurriedStringComponent}}
    {{/let}}
  `
);

// Currying a named arg makes it optional but still override-able
typeTest(
  {
    StringComponent,
    formModifier,
    expectedType: {} as WithBoundArgs<typeof StringComponent, 'value'>,
  },
  hbs`
    {{#let (component this.StringComponent value="hello") as |BoundStringComponent|}}
      <BoundStringComponent />
      <BoundStringComponent @value="overridden" />

      {{@expectTypeOf BoundStringComponent @to.equalTypeOf this.expectedType}}

      <BoundStringComponent {{this.formModifier}} as |value|>
        {{@expectTypeOf value @to.beString}}
      </BoundStringComponent>
    {{/let}}
  `
);

class ParametricComponent<T> extends Component<{
  Element: HTMLFormElement;
  Args: { values: Array<T>; optional?: string };
  Blocks: { default: [T, number] };
}> {}

// Simple no-op binding
typeTest(
  { ParametricComponent, formModifier },
  hbs`
    {{#let (component this.ParametricComponent) as |NoopCurriedParametricComponent|}}
      <NoopCurriedParametricComponent @values={{array "hi"}} {{this.formModifier}} />

      {{! @glint-expect-error: missing required arg }}
      <NoopCurriedParametricComponent />

      <NoopCurriedParametricComponent
        @values={{array}}
        {{! @glint-expect-error: extra arg }}
        @extra={{true}}
      />

      <NoopCurriedParametricComponent @values={{array "ok"}} {{this.formModifier}} as |value index|>
        {{@expectTypeOf value @to.beString}}
        {{@expectTypeOf index @to.beNumber}}
      </NoopCurriedParametricComponent>

      <NoopCurriedParametricComponent @values={{array true}} {{this.formModifier}} as |value index|>
        {{@expectTypeOf value @to.beBoolean}}
        {{@expectTypeOf index @to.beNumber}}
      </NoopCurriedParametricComponent>
    {{/let}}
  `
);

// Binding a required arg makes it optional
typeTest(
  { ParametricComponent, formModifier },
  hbs`
    {{#let (component this.ParametricComponent values=(array "hi")) as |RequiredValueCurriedParametricComponent|}}
      <RequiredValueCurriedParametricComponent @values={{array "hi"}} {{this.formModifier}} />

      <RequiredValueCurriedParametricComponent />

      {{! @glint-expect-error: wrong type for what we pre-bound above }}
      <RequiredValueCurriedParametricComponent @values={{array 1 2 3}} />

      <RequiredValueCurriedParametricComponent
        {{! @glint-expect-error: extra arg }}
        @extra={{true}}
      />

      <RequiredValueCurriedParametricComponent {{this.formModifier}} as |value index|>
        {{@expectTypeOf value @to.beString}}
        {{@expectTypeOf index @to.beNumber}}
      </RequiredValueCurriedParametricComponent>
    {{/let}}
  `
);

// Binding an optional arg still leaves the required one(s)
typeTest(
  { ParametricComponent, formModifier },
  hbs`
    {{#let (component this.ParametricComponent optional="hi") as |OptionalValueCurriedParametricComponent|}}
      <OptionalValueCurriedParametricComponent @values={{array "hi"}} {{this.formModifier}} />

      {{! @glint-expect-error: missing required arg }}
      <OptionalValueCurriedParametricComponent />

      <OptionalValueCurriedParametricComponent
        {{! @glint-expect-error: extra arg }}
        @extra={{true}}
      />

      <OptionalValueCurriedParametricComponent @values={{array "ok"}} {{this.formModifier}} as |value index|>
        {{@expectTypeOf value @to.beString}}
        {{@expectTypeOf index @to.beNumber}}
      </OptionalValueCurriedParametricComponent>


      <OptionalValueCurriedParametricComponent @values={{array true}} {{this.formModifier}} as |value index|>
        {{@expectTypeOf value @to.beBoolean}}
        {{@expectTypeOf index @to.beNumber}}
      </OptionalValueCurriedParametricComponent>
    {{/let}}
  `
);
