import { AcceptsBlocks, NoNamedArgs } from '@glint/template/-private';
import { Invokable } from '@glint/template/-private/resolution';

export type LinkToKeyword = Invokable<{
  (args: NoNamedArgs, route: string, ...params: unknown[]): AcceptsBlocks<{
    default?: [];
  }>;
}>;

export interface LinkToArgs {
  route: string;
  disabled?: boolean;
  activeClass?: string;
  'current-when'?: string;
  model?: unknown;
  preventDefault?: boolean;
  tagName?: string;
  query?: Record<string, unknown>;
}

export type LinkToComponent = Invokable<{
  (args: LinkToArgs): AcceptsBlocks<{ default: [] }>;
}>;
