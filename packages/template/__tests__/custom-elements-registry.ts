/**
 * Registers custom elements for use in other test files, ensuring that
 * registration works across module boundaries (i.e. you don't have to
 * declaration-merge in the same file where you use a custom element).
 *
 * NOTE: because these are global interface merges, the registrations below
 * are visible to every test file in this project. Keep the registered tag
 * names distinctive, and give the element classes distinguishing members so
 * they aren't structurally identical to `HTMLElement` (which would make the
 * reverse type-to-tag-name lookup ambiguous).
 */

export class RegisteredElement extends HTMLElement {
  declare registeredElementProp: number;
}

export class RegisteredElementWithAttrs extends HTMLElement {
  declare propNum: number;
  declare propStr: string;
}

export interface RegisteredElementAttributes {
  'prop-num': number;
  'prop-str': string;
}

declare global {
  interface GlintCustomElementTagNameMap {
    // Element type only: `<registered-element>` gets a real element type
    // (for modifiers, splattributes, hover), attributes stay unchecked.
    'registered-element': RegisteredElement;

    // Element type + attributes: fully checked.
    'registered-element-with-attrs': RegisteredElementWithAttrs;
  }

  interface GlintCustomElementAttributesMap {
    'registered-element-with-attrs': RegisteredElementAttributes;

    // Attributes only: `<attrs-only-element>` has checked attributes even
    // though its element type is just `Element`.
    'attrs-only-element': { count: number };
  }
}
