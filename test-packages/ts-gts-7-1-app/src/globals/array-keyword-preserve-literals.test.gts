import type { TOC } from '@ember/component/template-only';

// Regression guard: the built-in {{array}} keyword must preserve literal elements
// (e.g. "case") so it satisfies a literal-first tuple target such as a maplibre-gl
// expression spec (["case", ...] | ["interpolate", ...]). The `const` on ArrayHelper
// is what preserves them whenever no literal-first contextual target is in scope —
// i.e. wherever the array's type is finalized at a {{#let}} binding rather than
// directly at the argument position. Both cases below fail (literal widening) if the
// `const` is removed; a plain `<Layer @op={{helper (array ...)}} />` would NOT, since
// the `Expr` target flows back through the helper into the array.
type Expr = ['case', ...unknown[]] | ['interpolate', ...unknown[]];
const Layer: TOC<{ Args: { op: Expr } }> = <template></template>;

// Generic pass-through helper, used to exercise the nested-in-a-helper call shape.
const identity = <T,>(value: T): T => value;

<template>
  {{! ---- {{array}} bound directly via {{#let}} ---- }}
  {{#let (array "case" 1 2) as |op|}}
    <Layer @op={{op}} />
  {{/let}}

  {{! ---- {{array}} nested inside another helper, result bound via {{#let}} ---- }}
  {{#let (identity (array "case" 1 2)) as |op|}}
    <Layer @op={{op}} />
  {{/let}}
</template>
