import {
  AcceptsBlocks,
  DirectInvokable,
  EmptyObject,
  Invokable,
} from '@glint/template/-private/integration';

export type LinkToKeyword = DirectInvokable<{
  (args: EmptyObject, route: string, ...params: unknown[]): AcceptsBlocks<{
    default?: [];
  }>;
}>;

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
    'current-when'?: string;
    preventDefault?: boolean;
    tagName?: string;
  },
  'route' | 'model' | 'models' | 'query'
>;

export type LinkToComponent = new () => Invokable<
  (args: LinkToArgs) => AcceptsBlocks<{ default: [] }, HTMLAnchorElement>
>;
