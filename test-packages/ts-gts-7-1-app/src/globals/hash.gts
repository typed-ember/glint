<template>
  {{#let (hash name="ada" age=36) as |person|}}
    {{person.name}}-{{person.age}}
  {{/let}}
</template>
