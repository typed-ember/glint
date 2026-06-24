import type { TOC } from '@ember/component/template-only';

// The built-in {{array}} keyword widens literal elements (e.g. "case" -> string)
// wherever contextual typing is unavailable — a {{#let}} binding, or {{array}}
// nested inside another helper whose result is bound by {{#let}}. That widening
// stops it from satisfying a literal-first tuple target, e.g. a maplibre-gl
// expression spec like ["case", ...] | ["interpolate", ...].
type Expr = ['case', ...unknown[]] | ['interpolate', ...unknown[]];
const Layer: TOC<{ Args: { op: Expr } }> = <template></template>;

// Generic pass-through helper, used to exercise the nested-in-a-helper call shape.
const identity = <T,>(value: T): T => value;

<template>
  {{! ---- {{array}} bound directly via {{#let}} ---- }}
  {{#let (array "case" 1 2) as |op|}}
    {{! "case" widens to `string`, so this fails the literal-operator union.
        Remove the @glint-expect-error once {{array}} preserves literals. }}
    {{! @glint-expect-error }}
    <Layer @op={{op}} />
  {{/let}}

  {{! ---- {{array}} nested inside another helper, result bound via {{#let}} ---- }}
  {{#let (identity (array "case" 1 2)) as |op|}}
    {{! same widening, reached through the nested helper }}
    {{! @glint-expect-error }}
    <Layer @op={{op}} />
  {{/let}}
</template>
