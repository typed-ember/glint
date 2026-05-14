<template>
  {{#each (array "a" "b" "c") as |item|}}
    {{item}}
  {{/each}}

  {{#each (array "a" 1 (hash)) as |item|}}
    {{! @glint-expect-error hash is not a content value }}
    {{item}}
  {{/each}}

  {{! @glint-expect-error array of content values is not a content value }}
  {{array 1}}
</template>
