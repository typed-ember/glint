import { EmptyObject, HasContext } from '@glint/template/-private/integration';

type Constructor<T> = abstract new (...args: never[]) => T;

/**
 * A utility for constructing the type of an environment's `resolveOrReturn` from
 * the type of its `resolve` function.
 */
export type ResolveOrReturn<T> = T & (<U>(item: U) => (args: EmptyObject) => U);

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
 * Given the constructor or instance type of a component backing class, produces the appropriate
 * `TemplateContext` type for its template.
 */
export type ResolveContext<T> = T extends HasContext<infer Context>
  ? Context
  : T extends Constructor<HasContext<infer Context>>
  ? Context
  : unknown;
