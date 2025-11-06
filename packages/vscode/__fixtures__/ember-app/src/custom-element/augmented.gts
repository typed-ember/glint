import '@glint/template';

declare global {
    interface HTMLStyleElementAttributes {
        scoped: '';
        inline: '';
    }
}
class MyCustomElement extends HTMLElement {
  propNum!: number;
  propStr!: string;
}

declare global {
  interface GlintCustomElementRegistry {
    MyCustomElement: MyCustomElement;
    'my-custom-element': MyCustomElement;
  }

  // interface GlintHtmlElementAttributesMap {
  //   MyCustomElement: {
  //     propNum: number;
  //     propStr: string;
  //   };
  // }
}


<template>
  <p>hi</p>
  <style scoped inline>
    p { color: red; }
  </style>
</template>