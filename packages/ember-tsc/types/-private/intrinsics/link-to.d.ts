import { ComponentLike } from '@glint/template';
import { ComponentReturn, DirectInvokable, NamedArgs } from '@glint/template/-private/integration';

type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
  }[Keys];

type LinkToArgs = RequireAtLeastOne<
  {
    route?: string;
    model?: unknown;
    models?: unknown[];
    query?: Record<string, unknown>;
    disabled?: boolean;
    activeClass?: string;
    'current-when'?: string | boolean;
    preventDefault?: boolean;
    replace?: boolean;
    tagName?: string;
  },
  'route' | 'model' | 'models' | 'query'
>;

type LinkToReturn = ComponentReturn<{ default: [] }, HTMLAnchorElement>;

export type LinkToComponent = ComponentLike<{
  Args: LinkToArgs;
  Blocks: { default: [] };
  Element: HTMLAnchorElement;
}>;
