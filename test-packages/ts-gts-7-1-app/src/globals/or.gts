<template>
  {{#if (or false "kept")}}or{{/if}}

  {{! `or` requires at least two arguments at runtime (it throws otherwise),
      so fewer than two is a type error. }}
  {{! @glint-expect-error: or requires at least two arguments }}
  {{#if (or false)}}or{{/if}}

  {{or false 0 undefined (array) "kept"}}
</template>
