<template>
  {{#if (or false "kept")}}or{{/if}}
  {{#if (or false)}}or{{/if}}
  {{or false 0 undefined (array) "kept"}}
</template>
