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
    // - A known HTML or SVG tag name narrows to the corresponding element type.
    // When a name exists in both maps (e.g. `a`, `script`, `style`, `title`)
    // the HTML element wins, matching the default (non-SVG) namespace at
    // runtime.
    // - An empty string renders the block without a wrapping element, so there
    // is no element to receive attributes (`null`, which makes applying any
    // attribute a type error).
    // - An empty string OR something else, however, narrows down to that
    // something - as the user might want to use the tag.
    // - Any other (dynamic) tag name falls back to the base `Element`, covering
    // both HTML and SVG.
    Element: [K] extends ['']
      ? null
      : Exclude<K, ''> extends keyof HTMLElementTagNameMap
        ? HTMLElementTagNameMap[Exclude<K, ''>]
        : Exclude<K, ''> extends keyof SVGElementTagNameMap
          ? SVGElementTagNameMap[Exclude<K, ''>]
          : Element;
    Args: Record<string, unknown>;
    Blocks: { default: [] };
  }>;
}>;
