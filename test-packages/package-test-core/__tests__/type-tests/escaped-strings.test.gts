// Backslash escapes inside template string literals are raw text to the
// preprocessor, not JS escapes: `\'` and `\"` must survive the tagged-template
// round-trip intact or the template fails to parse (typed-ember/glint#1239).
const fm = (s: string): string => s;

<template>
  {{fm 'you\'ve arrived'}}
  {{fm "say \"hi\" now"}}
</template>
