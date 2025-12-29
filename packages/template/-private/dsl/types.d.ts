import './elements';
import './custom-elements';
import { AttrValue } from '../index';
import type { HTMLElementMap, SVGElementMap } from './lib.dom.augmentation';

export type GlintElementRegistry = HTMLElementMap & SVGElementMap;

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
type Lookup<T> = {
  [K in keyof GlintElementRegistry]: [GlintElementRegistry[K]] extends [T] // check assignability in one direction
    ? [T] extends [GlintElementRegistry[K]] // and in the other
      ? K // if both true, exact match
      : never
    : never;
}[keyof GlintElementRegistry];

export type CustomElementLookup<T> = {
  [K in keyof GlintCustomElementMap]: [GlintCustomElementMap[K]] extends [T]
    ? [T] extends [GlintCustomElementMap[K]]
      ? K
      : never
    : never;
}[keyof GlintCustomElementMap];

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
  : // By default, the GlintCustomElementMap is empty
    Name extends keyof GlintCustomElementMap
    ? GlintCustomElementMap[Name]
    : // If there is no match, we can fallback to the originating ancestor Element type
      Element;

export type SVGElementForTagName<Name extends string> = Name extends keyof SVGElementTagNameMap
  ? SVGElementTagNameMap[Name]
  : Element;

export type MathMlElementForTagName<Name extends string> =
  Name extends keyof MathMLElementTagNameMap ? MathMLElementTagNameMap[Name] : Element;

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
type HTMLElementLookup<T> = {
  [K in keyof HTMLElementMap]: T extends HTMLElementMap[K]
    ? HTMLElementMap[K] extends T
      ? K
      : never
    : never;
}[keyof HTMLElementMap];

type SVGElementLookup<T> = {
  [K in keyof SVGElementMap]: T extends SVGElementMap[K]
    ? SVGElementMap[K] extends T
      ? K
      : never
    : never;
}[keyof SVGElementMap];

type WithDataAttributes<T> = T & Record<`data-${string}`, AttrValue>;

export type AttributesForElement<Elem extends Element, K = Lookup<Elem>> =
  // Is K in the HTML attributes map?
  K extends keyof GlintHtmlElementAttributesMap
    ? WithDataAttributes<GlintHtmlElementAttributesMap[K]>
    : // Or is K in the SVG attributes map?
      K extends keyof GlintSvgElementAttributesMap
      ? WithDataAttributes<GlintSvgElementAttributesMap[K]>
      : // If the element can't be found: fallback to just allow general AttrValue
        // NOTE: MathML has no attributes
        Record<string, AttrValue>;

export type AttributesForKeyInMap<K extends string, M> = K extends keyof M
  ? WithDataAttributes<M[K]>
  : K extends never
    ? `Invalid key passed (never)`
    : `key "${K}" not found in map`;

export type AttributesForStandardElement<Elem extends Element, K = Lookup<Elem>> =
  // Is K in the HTML attributes map?
  K extends keyof GlintHtmlElementAttributesMap
    ? WithDataAttributes<GlintHtmlElementAttributesMap[K]>
    : // Or is K in the SVG attributes map?
      K extends keyof GlintSvgElementAttributesMap
      ? WithDataAttributes<GlintSvgElementAttributesMap[K]>
      : // If the element can't be found: fallback to just allow general AttrValue
        // NOTE: MathML has no attributes
        Record<string, AttrValue>;

export type AttributesForElement<
  Elem extends Element,
  K = Lookup<Elem>,
> = AttributesForStandardElement<Elem, K>;

export type AttributesForTagName<Name extends string> = Name extends keyof GlintTagNameAttributesMap
  ? WithDataAttributes<GlintTagNameAttributesMap[Name]>
  : WithDataAttributes<GlintTagNameAttributesMap['HTMLElement']>;

export type AttributeRecord<RecordType> = {
  [K in keyof RecordType]: RecordType[K];
};

export type ElementInfoForElementType<ElemType extends Element> = {
  element: ElemType;
  attributes: AttributesForElement<ElemType>;
  name: 'unknown';
};
