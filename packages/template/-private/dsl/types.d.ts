import { HasContext } from '@glint/template/-private/integration';

type Constructor<T> = new (...args: any) => T;

/**
 * Given a tag name, returns an appropriate `Element` subtype.
 * NOTE: This will return a union for elements that exist both in HTML and SVG. Technically, this will be too permissive.
 */
export type ElementForTagName<Name extends string> = Name extends keyof HTMLElementTagNameMap
  ? Name extends keyof SVGElementTagNameMap
    ? HTMLElementTagNameMap[Name] & SVGElementTagNameMap[Name]
    : HTMLElementTagNameMap[Name]
  : Name extends keyof SVGElementTagNameMap
  ? SVGElementTagNameMap[Name]
  : Element;

/**
 * Given the instance type of a component backing class, produces the appropriate
 * `TemplateContext` type for its template.
 */
export type ResolveContext<T> = T extends HasContext<infer Context> ? Context : unknown;
