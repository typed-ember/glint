/**
 * Tests for these things are used elsewhere, to ensure that we don't have to declaration merge in the file we use custom elements in
 */
import '@glint/template';

class MyCustomElement extends HTMLElement {
  propNum!: number;
  propStr!: string;
}

declare global {
  interface GlintCustomElements {
    'my-custom-element-emit-element': MyCustomElement;
  }

  interface GlintElementRegistry {
    MyCustomElement: MyCustomElement;
  }

  interface GlintHtmlElementAttributesMap {
    MyCustomElement: {
      propNum: number;
      propStr: string;
    };
  }
}
