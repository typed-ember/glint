// `eq`/`neq` compile to native `===`/`!==`, so comparing two provably-disjoint
// literal types (e.g. `1` and `2`) would trip TypeScript's TS2367
// "unintentional comparison" check. Real comparisons are between values whose
// types overlap, so we exercise them with `number`-typed operands.
const a = 1 as number;
const b = 2 as number;

const date = new Date();

<template>
  {{! ---- (RFC 561) eq / neq / lt / lte / gt / gte ---- }}
  {{#if (eq a b)}}eq{{/if}}
  {{#if (neq a b)}}neq{{/if}}
  {{#if (lt 1 2)}}lt{{/if}}
  {{#if (lt "1" "2")}}lt{{/if}}
  {{#if (lt date date)}}lt{{/if}}
  {{! @glint-expect-error }}
  {{#if (lt 1 "2")}}lt{{/if}}
  {{#if (lte 1 2)}}lte{{/if}}
  {{#if (lte "1" "2")}}lte{{/if}}
  {{#if (lte date date)}}lte{{/if}}
  {{! @glint-expect-error }}
  {{#if (lte 1 "2")}}lt{{/if}}
  {{#if (gt 2 1)}}gt{{/if}}
  {{#if (gt "2" "1")}}gt{{/if}}
  {{#if (gt date date)}}gt{{/if}}
  {{! @glint-expect-error }}
  {{#if (gt 1 "2")}}lt{{/if}}
  {{#if (gte 2 2)}}gte{{/if}}
  {{#if (gte "2" "2")}}gte{{/if}}
  {{#if (gte date date)}}gte{{/if}}
  {{! @glint-expect-error }}
  {{#if (gte 1 "2")}}lt{{/if}}
</template>
