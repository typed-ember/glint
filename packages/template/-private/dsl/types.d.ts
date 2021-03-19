import { HasContext, HasElement } from '@glint/template/-private/integration';

type Constructor<T> = new (...args: any) => T;

/** Given a tag name, returns an appropriate `Element` subtype. */
export type ElementForTagName<Name extends string> = Name extends keyof HTMLElementTagNameMap
  ? HTMLElementTagNameMap[Name]
  : Element;

/** Given a component class, returns its `[Element]` type or `null` if it has none. */
export type ElementForComponent<T extends Constructor<HasElement<any>>> = T extends Constructor<
  HasElement<infer El>
>
  ? El
  : null;

/**
 * Given the instance type of a component backing class, produces the appropriate
 * `TemplateContext` type for its template.
 */
export type ResolveContext<T> = T extends HasContext<infer Context> ? Context : unknown;
