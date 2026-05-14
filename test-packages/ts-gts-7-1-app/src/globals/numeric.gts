<template>
  {{! ---- (RFC 561) eq / neq / lt / lte / gt / gte ---- }}
  {{#if (eq 1 1)}}eq{{/if}}
  {{#if (neq 1 2)}}neq{{/if}}
  {{#if (lt 1 2)}}lt{{/if}}
  {{#if (lte 1 2)}}lte{{/if}}
  {{#if (gt 2 1)}}gt{{/if}}
  {{#if (gte 2 2)}}gte{{/if}}
</template>
