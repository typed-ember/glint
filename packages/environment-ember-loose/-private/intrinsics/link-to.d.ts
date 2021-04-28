import { AcceptsBlocks, DirectInvokable, Invokable } from '@glint/template/-private/integration';

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
    bubbles?: boolean;
    preventDefault?: boolean;
    tagName?: string;
  },
  'route' | 'model' | 'models' | 'query'
>;

export type LinkToKeyword = DirectInvokable<{
  (args: LinkToArgs): AcceptsBlocks<{ default: [] }>;
  (args: Partial<LinkToArgs>, route: string, ...params: unknown[]): AcceptsBlocks<{
    default?: [];
  }>;
}>;

export type LinkToComponent = new () => Invokable<
  (args: LinkToArgs) => AcceptsBlocks<{ default: [] }, HTMLAnchorElement>
>;
