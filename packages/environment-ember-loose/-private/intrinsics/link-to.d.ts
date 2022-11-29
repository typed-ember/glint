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
    tagName?: string;
  },
  'route' | 'model' | 'models' | 'query'
>;

type LinkToReturn = ComponentReturn<{ default: [] }, HTMLAnchorElement>;

export type LinkToKeyword = DirectInvokable<{
  // `{{link-to}}` classic invocation
  (route: string, ...params: Array<unknown>): LinkToReturn;

  // `<LinkTo>` invocation, but accessed via `'link-to'` e.g. with `{{component}}`
  (named: NamedArgs<LinkToArgs>): LinkToReturn;
}>;

export type LinkToComponent = ComponentLike<{
  Args: LinkToArgs;
  Blocks: { default: [] };
  Element: HTMLAnchorElement;
}>;
