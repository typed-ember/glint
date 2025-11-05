import './elements';
import { AttrValue } from '../index';
import { GlintElementRegistry } from './lib.dom.augmentation';

/**
 * This doesn't generate _totally_ unique mappings, but they all have the same attributes.
 *
 * For example, given T = HTMLDivElement,
 * we get back:
 *   - "HTMLTableCaptionElement"
 *     | "HTMLDivElement"
 *     | "HTMLHeadingElement"
 *     | "HTMLParagraphElement"
 *
 * And for the purposes of attribute lookup, that's good enough.
 */
export type Lookup<T> = {
  [K in keyof GlintElementRegistry]: [GlintElementRegistry[K]] extends [T] // check assignability in one direction
    ? [T] extends [GlintElementRegistry[K]] // and in the other
      ? K // if both true, exact match
      : never
    : never;
}[keyof GlintElementRegistry];

/**
 * Same thing, but for CustomElements
 */
export type CustomElementLookup<T> = {
  [K in keyof GlintCustomElementRegistry]: [GlintCustomElementRegistry[K]] extends [T] // check assignability in one direction
    ? [T] extends [GlintCustomElementRegistry[K]] // and in the other
      ? K // if both true, exact match
      : never
    : never;
}[keyof GlintCustomElementRegistry];

/**
 * A utility for constructing the type of an environment's `resolveOrReturn` from
 * the type of its `resolve` function.
 */
export type ResolveOrReturn<T> = T & (<U>(item: U) => () => U);

/**
 * Given a tag name, returns an appropriate `Element` subtype.
 * NOTE: This will return a union for elements that exist both in HTML and SVG. Technically, this will be too permissive.
 */
export type ElementForTagName<Name extends string> = Name extends keyof HTMLElementTagNameMap
  ? HTMLElementTagNameMap[Name]
  : Name extends keyof GlintCustomElementRegistry
    ? GlintCustomElementRegistry[Name]
    : Element;

export type SVGElementForTagName<Name extends string> = Name extends keyof SVGElementTagNameMap
  ? SVGElementTagNameMap[Name]
  : Element;

export type MathMlElementForTagName<Name extends string> =
  Name extends keyof MathMLElementTagNameMap ? MathMLElementTagNameMap[Name] : Element;

type WithDataAttributes<T> = T & Record<`data-${string}`, AttrValue>;

export type AttributesForElement<Elem extends Element, K = Lookup<Elem>> =
  // Is K in the HTML attributes map?
  K extends keyof GlintHtmlElementAttributesMap
    ? WithDataAttributes<GlintHtmlElementAttributesMap[K]>
    : // Or is K in the SVG attributes map?
      K extends keyof GlintSvgElementAttributesMap
      ? WithDataAttributes<GlintSvgElementAttributesMap[K]>
      : K extends keyof GlintCustomElementRegistry
        ? WithDataAttributes<GlintHtmlElementAttributesMap[K]>
        : // If the element can't be found: fallback to just allow general AttrValue
          // NOTE: MathML has no attributes
          Record<string, AttrValue>;
