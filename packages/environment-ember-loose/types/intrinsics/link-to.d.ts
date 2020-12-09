import { AcceptsBlocks, NoNamedArgs } from '@glint/template/-private';

export interface LinkToKeyword {
  (args: NoNamedArgs, route: string, ...params: unknown[]): AcceptsBlocks<{
    default?: [];
  }>;
}

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

export interface LinkToComponent {
  (args: LinkToArgs): AcceptsBlocks<{ default: [] }>;
}
