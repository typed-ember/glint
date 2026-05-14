<template>
  {{! ---- (RFC 389) element ---- }}
  {{#let (element "section") as |Tag|}}
    <Tag>hello</Tag>
  {{/let}}
</template>
