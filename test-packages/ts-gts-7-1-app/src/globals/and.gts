<template>
  {{#if (and true "kept")}}and{{/if}}
  {{and true true 2 "ignored" "kept"}}
  {{and true}}
  {{#if (and false)}}
    unreachable
  {{/if}}

</template>
