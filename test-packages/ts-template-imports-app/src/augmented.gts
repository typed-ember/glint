import '@glint/template';

declare global {
    interface HTMLStyleElementAttributes {
        scoped: '';
        inline: '';
    }
}

<template>
  <p>hi</p>
  <style scoped inline>
    p { color: red; }
  </style>
</template>