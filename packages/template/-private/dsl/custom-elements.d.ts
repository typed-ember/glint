declare global {
  /**
   * Map of element tag names to their type.  Used by `emitElement` via `ElementForTagName`.
   *
   * By default, this interface is empty; to add custom elements, you can
   * augment it in your own project like so:
   * ```ts
   * declare global {
   *  interface GlintCustomElements {
   *    'my-custom-element': MyCustomElementClass;
   *  }
   * }
   * ```
   *
   * When doing this, you'll also want your props and attributes to be typed, and that is configured
   * through a separate declaration merge as TypeScript doesn't have a way of accessing which attributes/props
   * are valid for a given element type.
   *
   * ```ts
   * declare global {
   *  interface GlintHtmlElementAttributesMap {
   *    'my-custom-element': {
   *      propNum: number;
   *      propStr: string;
   *    };
   *  }
   * }
   * ```
   */
  interface GlintCustomElements {
    /* intentionally empty, as there are no custom elements by default */
  }
}
