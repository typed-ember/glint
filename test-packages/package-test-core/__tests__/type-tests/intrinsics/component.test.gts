import Component from '@ember/component';
import { expectTypeOf, to } from '@glint/type-test';
import { array } from '@ember/helper';
import type { WithBoundArgs, ModifierLike } from '@glint/template';

declare const formModifier: ModifierLike<{ Element: HTMLFormElement }>;

class StringComponent extends Component<{
  Element: HTMLFormElement;
  Args: { value: string };
  Blocks: { default: [string] };
}> {}

// Simple no-op binding
const NoopBindingTest = <template>
  {{#let (component StringComponent) as |NoopCurried|}}
    <NoopCurried @value="hi" {{formModifier}} />

    {{! @glint-expect-error: missing required arg }}
    <NoopCurried />

    <NoopCurried @value="ok" {{formModifier}} as |value|>
      {{expectTypeOf value to.beString}}
    </NoopCurried>
  {{/let}}
</template>;

// Nullable in, nullable out
{
  const NullableStringComponent = StringComponent as typeof StringComponent | null;

  const NullableTest = <template>
    {{#let (component NullableStringComponent) as |NoopCurried|}}
      <NoopCurried @value="hi" />
      {{expectTypeOf null to.beAssignableToTypeOf NoopCurried}}
    {{/let}}
  </template>;
}

// Currying a named arg makes it optional but still override-able
{
  const expectedType = {} as WithBoundArgs<typeof StringComponent, 'value'>;

  const CurriedArgTest = <template>
    {{#let (component StringComponent value="hello") as |BoundStringComponent|}}
      <BoundStringComponent />
      <BoundStringComponent @value="overridden" />

      {{expectTypeOf BoundStringComponent to.equalTypeOf expectedType}}

      <BoundStringComponent {{formModifier}} as |value|>
        {{expectTypeOf value to.beString}}
      </BoundStringComponent>
    {{/let}}
  </template>;
}

class ParametricComponent<T> extends Component<{
  Element: HTMLFormElement;
  Args: { values: Array<T>; optional?: string };
  Blocks: { default: [T, number] };
}> {}

// Simple no-op binding with generics
const NoopParametricTest = <template>
  {{#let (component ParametricComponent) as |NoopCurried|}}
    <NoopCurried @values={{array "hi"}} {{formModifier}} />

    {{! @glint-expect-error: missing required arg }}
    <NoopCurried />

    <NoopCurried
      @values={{array}}
      {{! @glint-expect-error: extra arg }}
      @extra={{true}}
    />

    <NoopCurried @values={{array "ok"}} {{formModifier}} as |value index|>
      {{expectTypeOf value to.beString}}
      {{expectTypeOf index to.beNumber}}
    </NoopCurried>

    <NoopCurried @values={{array true}} {{formModifier}} as |value index|>
      {{expectTypeOf value to.beBoolean}}
      {{expectTypeOf index to.beNumber}}
    </NoopCurried>
  {{/let}}
</template>;

// Binding a required arg makes it optional
const RequiredArgCurriedTest = <template>
  {{#let (component ParametricComponent values=(array "hi")) as |RequiredCurried|}}
    <RequiredCurried @values={{array "hi"}} {{formModifier}} />

    <RequiredCurried />

    {{! TODO: should error (wrong type for pre-bound) but T is erased in .gts }}
    <RequiredCurried @values={{array 1 2 3}} />

    <RequiredCurried
      {{! @glint-expect-error: extra arg }}
      @extra={{true}}
    />

    {{! TODO: value should be string but T is erased through pre-binding in .gts }}
    <RequiredCurried {{formModifier}} as |value index|>
      {{expectTypeOf index to.beNumber}}
    </RequiredCurried>
  {{/let}}
</template>;

// Binding an optional arg still leaves the required one(s)
const OptionalArgCurriedTest = <template>
  {{#let (component ParametricComponent optional="hi") as |OptionalCurried|}}
    <OptionalCurried @values={{array "hi"}} {{formModifier}} />

    {{! @glint-expect-error: missing required arg }}
    <OptionalCurried />

    <OptionalCurried
      {{! @glint-expect-error: extra arg }}
      @extra={{true}}
    />

    <OptionalCurried @values={{array "ok"}} {{formModifier}} as |value index|>
      {{expectTypeOf value to.beString}}
      {{expectTypeOf index to.beNumber}}
    </OptionalCurried>

    <OptionalCurried @values={{array true}} {{formModifier}} as |value index|>
      {{expectTypeOf value to.beBoolean}}
      {{expectTypeOf index to.beNumber}}
    </OptionalCurried>
  {{/let}}
</template>;
