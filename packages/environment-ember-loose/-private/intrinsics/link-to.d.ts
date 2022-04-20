import { ComponentLike } from '@glint/template';

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

export type LinkToKeyword = ComponentLike<{
  Args: {
    Named: Partial<LinkToArgs>;
    Positional: [route?: string, ...params: unknown[]];
  };
  Element: HTMLAnchorElement;
  Blocks: { default: [] };
}>;

export type LinkToComponent = ComponentLike<{
  Args: LinkToArgs;
  Blocks: { default: [] };
  Element: HTMLAnchorElement;
}>;
