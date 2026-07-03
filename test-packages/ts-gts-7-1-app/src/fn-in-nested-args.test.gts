import type { TemplateOnlyComponent } from '@ember/component/template-only';
import type { TOC } from '@ember/component/template-only';
import { fn } from '@ember/helper';
import { hash } from '@ember/helper';
import type { WithBoundArgs } from '@glint/template';
import { expectTypeOf, to } from '@glint/type-test';

// Regression guard for https://github.com/typed-ember/glint/issues/1147
//
// An inline `(fn ...)` call inside another invocation's arguments used to
// collapse the outer call's entire type inference: `FnHelper` is overloaded
// (one overload per bound-argument arity), and TypeScript's nested-call
// re-inference only handles single-signature callees, so
// `{{component Foo onChange=(fn ...)}}` produced
// `Invokable<(...args: unknown[]) => unknown>` instead of the bound component
// type. The transform now emits `fn` as a comma pair — the real (overloaded)
// call for argument validation, single-signature `bindPositional` for the
// resulting type — so the outer inference sees only a resolved value.

const MyComponent: TOC<{
  Args: (
    | { value?: Date | null; onChange?: (date: Date) => void }
    | { range?: [Date, Date]; onRangeChange?: (range: [Date, Date]) => void }
  ) & {
    otherArgument: boolean;
  };
}> = <template></template>;

const someDate: Date | null | undefined = new Date();

function onChangeWith(cb: () => void, date: Date): void {
  void cb;
  void date;
}

function noop(): void {}

<template>
  {{#let
    (component
      MyComponent
      otherArgument=true
      value=someDate
      onChange=(fn onChangeWith noop)
    )
    as |CwithFn|
  }}
    {{yield (hash SomeComponent=CwithFn)}}
  {{/let}}
</template> satisfies TemplateOnlyComponent<{
  Blocks: {
    default: [
      {
        SomeComponent: WithBoundArgs<typeof MyComponent, 'value' | 'onChange'>;
      },
    ];
  };
}>;

// Direct `{{fn}}` type behavior away from nested-argument positions, plus the
// `(fn (mut ...))` forms that FnHelper's Mut overloads validate and
// `bindPositional`'s Mut branch types.
const state = { count: 0 };

const directForms = <template>
  {{expectTypeOf (fn onChangeWith) to.equalTypeOf onChangeWith}}
  {{expectTypeOf (fn onChangeWith noop) to.beAssignableToTypeOf someDateHandler}}
  {{expectTypeOf (fn (mut state.count)) to.equalTypeOf numberSetter}}
  {{expectTypeOf (fn (mut state.count) 5) to.equalTypeOf thunk}}
</template>;
void directForms;

declare const someDateHandler: (date: Date) => void;
declare const numberSetter: (value: number) => void;
declare const thunk: () => void;
