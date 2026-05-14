import { ComponentLike } from '@glint/template';
import { DirectInvokable } from '@glint/template/-private/integration';

/**
 * `(element "tag-name")` — yields a component bound to a dynamic HTML tag
 * name. Built-in keyword in ember-source >= 7.1 (RFC 389).
 */
export type ElementHelper = DirectInvokable<{
  (tagName: string): ComponentLike<{
    Element: Element;
    Args: Record<string, unknown>;
    Blocks: { default: [] };
  }>;
}>;
