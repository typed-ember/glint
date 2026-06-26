<template>
  {{#if (and true "kept")}}and{{/if}}
  {{and true true 2 "ignored" "kept"}}

  {{! `and` requires at least two arguments at runtime (it throws otherwise),
      so fewer than two is a type error. }}
  {{! @glint-expect-error: and requires at least two arguments }}
  {{and true}}
  {{! @glint-expect-error: and requires at least two arguments }}
  {{#if (and false)}}
    unreachable
  {{/if}}

</template>
