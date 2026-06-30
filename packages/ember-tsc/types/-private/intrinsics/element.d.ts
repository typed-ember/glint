import { ComponentLike } from '@glint/template';
import { DirectInvokable } from '@glint/template/-private/integration';

/**
 * `(element "tag-name")` — yields a component bound to a dynamic HTML tag
 * name. Built-in keyword in ember-source >= 7.1 (RFC 389).
 */
export type ElementHelper = DirectInvokable<{
  // `const K` preserves the literal tag name (e.g. `"video"`) through Glint's
  // `resolve()` inference; without it TypeScript widens the argument to `string`
  // and narrowing collapses to the base `Element`. The `string & {}` member lets
  // a genuinely dynamic (non-literal) tag name still match and fall back to
  // `Element`, covering both HTML and SVG.
  <const K extends keyof HTMLElementTagNameMap | keyof SVGElementTagNameMap | (string & {})>(
    tagName: K,
  ): ComponentLike<{
    // Resolve the tag name `K` to the element type it produces, from the
    // most-specific case to the least. Each branch is explained below.
    //
    //   ┌─ K is exactly ''      → null     (no wrapping element)
    //   ├─ K is `'tag' | ''`    → Element  (ambiguous: may or may not render)
    //   ├─ K is a known HTML tag → HTMLElementTagNameMap[K]
    //   ├─ K is a known SVG tag  → SVGElementTagNameMap[K]
    //   └─ K is a dynamic string → Element  (unknown tag)
    //
    Element: [K] extends [''] // // `'video' | ''` falls through to Case 2. // attributes. Tuple-wrapping keeps this non-distributive, so a union like // Case 1: exactly `''` — no wrapping element renders, so it can't receive //
      ? null
      : //
        // Case 2: a union containing `''` (e.g. `'video' | ''`) is ambiguous —
        // it may or may not render — so fall back to base `Element`.
        //
        '' extends K
        ? Element
        : //
          // Case 3: a known HTML tag. Names in both maps (e.g. `"a"`) match
          // HTML first — the default, non-SVG namespace.
          //
          K extends keyof HTMLElementTagNameMap
          ? HTMLElementTagNameMap[K]
          : //
            // Case 4: a known SVG tag.
            //
            K extends keyof SVGElementTagNameMap
            ? SVGElementTagNameMap[K]
            : //
              // We could not determine what type the user wants
              //
              Element;
    Args: Record<string, unknown>;
    Blocks: { default: [] };
  }>;
}>;
