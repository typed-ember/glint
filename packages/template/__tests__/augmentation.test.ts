/**
 * Tests for these things are used elsewhere, to ensure that we don't have to declaration merge in the file we use custom elements in
 */
import '@glint/template';


class AugmentedCustomElement extends HTMLElement {
  propNum!: number;
  propStr!: string;
 declare static readonly __brand: unique symbol;
}

declare global {
  interface GlintCustomElementRegistry {
    AugmentedCustomElement: AugmentedCustomElement;
    'augmented-custom-element': AugmentedCustomElement;
  }

  // interface GlintHtmlElementAttributesMap {
  //   AugmentedCustomElement: {
  //     propNum: number;
  //     propStr: string;
  //   };
  // }
}
