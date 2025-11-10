/**
 * Tests for these things are used elsewhere, to ensure that we don't have to declaration merge in the file we use custom elements in
 */
import '@glint/template';

export class AugmentedCustomElement extends HTMLElement {
  declare propNum: number;
  declare propStr: string;
}

export interface AugmentedCustomElementAttributes {
  propNum: number;
  propStr: string;
}

declare global {
  interface GlintCustomElementMap {
    'augmented-custom-element': typeof AugmentedCustomElement;
  }
  interface GlintTagNameAttributesMap {
    'augmented-custom-element': AugmentedCustomElementAttributes;
  }
}
