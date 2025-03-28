import { HtmlElementAttributes, SvgElementAttributes } from './elements';
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

export type MathMlElementForTagName<Name extends string> = Name extends keyof MathMLElementTagNameMap
  ? MathMLElementTagNameMap[Name]
  : Element;


type WithDataAttributes<T> = T & Record<`data-${string}`, AttrValue>;

export type AttributesForElement<
  Elem extends Element,
  K = Elem[typeof GlintSymbol],
> = K extends keyof HtmlElementAttributes.HtmlElements
  ? WithDataAttributes<HtmlElementAttributes.HtmlElements[K]>
  : K extends keyof SvgElementAttributes.SvgElements
    ? WithDataAttributes<SvgElementAttributes.SvgElements[K]>
    : K extends keyof SvgElementAttributes.SvgElements
      ? WithDataAttributes<SvgElementAttributes.SvgElements[K]>
      :Record<string, AttrValue>;
