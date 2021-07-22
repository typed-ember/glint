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
 * Given the constructor or instance type of a component backing class, produces the appropriate
 * `TemplateContext` type for its template.
 */
export type ResolveContext<T> = T extends HasContext<infer Context>
  ? Context
  : T extends Constructor<HasContext<infer Context>>
  ? Context
  : unknown;

// This encompasses both @glimmer/runtime and @ember/template's notion of `SafeString`s,
// and this coverage is tested in `emit-value.test.ts`.
type SafeString = { toHTML(): string };

/**
 * Represents values that can safely be emitted into the DOM i.e. as `<span>{{value}}</span>`.
 */
export type EmittableValue = SafeString | Element | string | number | boolean | null | void;
