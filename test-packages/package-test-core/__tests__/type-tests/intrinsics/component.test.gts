import Component from '@ember/component';
import { expectTypeOf, to } from '@glint/type-test';
import { array } from '@ember/helper';
import { hash } from '@ember/helper';
import type { WithBoundArgs, ModifierLike } from '@glint/template';
import type { TOC, TemplateOnlyComponent } from '@ember/component/template-only';

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
// (bare block for scoping — isolates declarations from other tests)
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

// Issue #1144: pre-binding an arg on a component whose `Args` is a union of
// all-optional constituents picked the wrong union member and reported TS2769.
{
  const UnionArgsComponent: TOC<{
    Args: { value?: Date; range?: never } | { value?: never; range?: [Date, Date] };
  }> = <template></template>;

  const someDate = new Date();
  const someRange = [someDate, someDate] as [Date, Date];

  const UnionArgsPrebindTest = <template>
    {{#let (component UnionArgsComponent) as |C|}}
      <C @value={{someDate}} />
      <C @range={{someRange}} />
      <C />

      {{! @glint-expect-error: can't mix args from both union constituents }}
      <C @value={{someDate}} @range={{someRange}} />
    {{/let}}

    {{#let (component UnionArgsComponent value=someDate) as |C|}}
      <C />
      <C @value={{someDate}} />
    {{/let}}

    {{#let (component UnionArgsComponent range=someRange) as |C|}}
      <C />
    {{/let}}

    {{! @glint-expect-error: attempting to curry an arg with the wrong type }}
    {{#let (component UnionArgsComponent value="not a date") as |C|}}
      <C />
    {{/let}}
  </template>;
}

// Issue #1144 (cont.): a union without `?: never` on the "other" keys. `keyof`
// and `Omit` over such a union only see common keys (here: none), so the
// curried component's remaining args used to collapse to `{}`.
{
  const LooseUnionComponent: TOC<{
    Args: { value?: Date } | { range?: [Date, Date] };
  }> = <template></template>;

  const someDate = new Date();

  const LooseUnionPrebindTest = <template>
    {{#let (component LooseUnionComponent value=someDate) as |C|}}
      <C />
      <C @value={{someDate}} />
    {{/let}}
  </template>;
}

// Issue #1144 (cont.): a union of constituents intersected with common args,
// yielded out as a WithBoundArgs-typed block param.
{
  const IntersectedUnionComponent: TOC<{
    Args: (
      | { value?: Date; onChange?: (date: Date) => void }
      | { range?: [Date, Date]; onRangeChange?: (range: [Date, Date]) => void }
    ) & {
      otherArgument: boolean;
    };
  }> = <template></template>;

  const someDate = new Date();

  function onChange(date: Date): void {}

  const IntersectedUnionPrebindTest = <template>
    {{#let
      (component IntersectedUnionComponent otherArgument=true value=someDate onChange=onChange)
      as |C|
    }}
      <C />
      {{yield (hash SomeComponent=C)}}
    {{/let}}

    {{! currying only a constituent-specific arg leaves the common arg required }}
    {{#let (component IntersectedUnionComponent value=someDate) as |C|}}
      <C @otherArgument={{false}} />

      {{! @glint-expect-error: missing required arg `otherArgument` }}
      <C />
    {{/let}}
  </template> satisfies TemplateOnlyComponent<{
    Blocks: {
      default: [
        {
          SomeComponent: WithBoundArgs<
            typeof IntersectedUnionComponent,
            'value' | 'onChange' | 'otherArgument'
          >;
        },
      ];
    };
  }>;
}

// Issue #661: WithBoundArgs with ModifierLike arg — verified fixed.
// Currying named args including ModifierLike no longer causes TS2589.
{
  class TriggerComponent extends Component<{
    Element: HTMLButtonElement;
    Args: {
      menu: { isOpen: boolean };
      trigger: ModifierLike<{ Element: HTMLButtonElement }>;
    };
    Blocks: { default: [] };
  }> {}

  const triggerMod = undefined as unknown as ModifierLike<{ Element: HTMLButtonElement }>;

  const WithBoundArgsModifierTest = <template>
    {{#let (component TriggerComponent menu=(hash isOpen=false) trigger=triggerMod) as |Bound|}}
      <Bound />
    {{/let}}
  </template>;
}
