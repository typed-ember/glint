// Registries for typed custom elements / web components.
//
// Both interfaces are intentionally empty by default; projects register
// their custom elements by merging additional entries into them via
// `declare global`.

declare global {
  /**
   * Maps custom element tag names to their element instance type, mirroring
   * the built-in `HTMLElementTagNameMap`. Registering an element here gives
   * `<my-element>` a real element type in templates, so modifiers,
   * `...attributes`, and hover information all work.
   *
   * ```ts
   * import type { MyElement } from './my-element';
   *
   * declare global {
   *   interface GlintCustomElementTagNameMap {
   *     'my-element': MyElement;
   *   }
   * }
   * ```
   *
   * Note that augmenting the standard `HTMLElementTagNameMap` (as is
   * conventional for custom elements, e.g. in Lit) works as well; this
   * interface exists for projects that prefer not to extend the DOM's own
   * registry.
   */
  interface GlintCustomElementTagNameMap {
    /* intentionally empty; projects register their own custom elements */
  }

  /**
   * Maps custom element tag names to the attributes they accept. There is no
   * TypeScript mechanism for deriving "settable attributes" from an element
   * class (methods and readonly DOM properties would leak in), so attributes
   * are registered separately from the element type.
   *
   * Attributes for tag names registered here are checked strictly; tag names
   * not registered here continue to accept arbitrary attribute values.
   *
   * ```ts
   * declare global {
   *   interface GlintCustomElementAttributesMap {
   *     'my-element': {
   *       'prop-num': number;
   *       'prop-str': string;
   *     };
   *   }
   * }
   * ```
   */
  interface GlintCustomElementAttributesMap {
    /* intentionally empty; projects register their own custom elements */
  }
}

export {};
