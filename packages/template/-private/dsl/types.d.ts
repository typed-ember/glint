import './elements';
import { AttrValue } from '../index';
import { GlintSymbol } from './lib.dom.augmentation';

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
  : Element;

export type SVGElementForTagName<Name extends string> = Name extends keyof SVGElementTagNameMap
  ? SVGElementTagNameMap[Name]
  : Element;

export type MathMlElementForTagName<Name extends string> =
  Name extends keyof MathMLElementTagNameMap ? MathMLElementTagNameMap[Name] : Element;

type WithDataAttributes<T> = T & Record<`data-${string}`, AttrValue>;

export type AttributesForElement<
  Elem extends Element,
  K = Elem extends { [GlintSymbol]: string }
    ? Elem[typeof GlintSymbol]
    : 'Could not determine element type',
> =
  // Is K in the HTML attributes map?
  K extends keyof GlintHtmlElementAttributesMap
    ? WithDataAttributes<GlintHtmlElementAttributesMap[K]>
    : // Or is K in the SVG attributes map?
      K extends keyof GlintSvgElementAttributesMap
      ? WithDataAttributes<GlintSvgElementAttributesMap[K]>
      : // If the element can't be found: fallback to just allow general AttrValue
        // NOTE: MathML has no attributes
        Record<string, AttrValue>;
