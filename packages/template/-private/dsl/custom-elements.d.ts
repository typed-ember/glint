declare global {
  /**
   * Map of element tag names to their type.  Used by `emitElement` via `ElementForTagName`.
   *
   * By default, this interface is empty; to add custom elements, you can
   * augment it in your own project like so:
   * ```ts
   * declare global {
   *  interface GlintCustomElementRegistry {
   *    'my-custom-element': MyCustomElementClass;
   *  }
   * }
   * ```
   *
   */
  interface GlintCustomElementMap {
    /* intentionally empty, as there are no custom elements by default */
  }
  /**
   * Map of custom element class names to their attributes type.
   *
   * This is a separate interface, because there isn't a TypeScript mechanism
   * to get the list of attributes and properties assignable to a given element type.
   *
   * You _could_ set loose values such as `typeof YourELement`, but then you'll have things
   * that don't make sense to assign in the template, such as methods (toString, etc)
   *
   * ```ts
   * declare global {
   *  interface GlintCustomElementAttributesMap {
   *    // ok, with caveats, easiest.
   *    'MyCustomElementClass': typeof MyCustomElementClass;
   *    // better, but more verbose
   *    'MyCustomElementClass': {
   *      propNum: number;
   *      propStr: string;
   *      // etc
   *  }
   * }
   * ```
   */
  interface GlintCustomElementAttributesMap {
    /* intentionally empty, as there are no custom elements by default */
  }
}
