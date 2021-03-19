import { AcceptsBlocks, DirectInvokable } from '../integration';

export type InElementKeyword = DirectInvokable<{
  (args: { insertBefore?: null }, element: Element): AcceptsBlocks<{ default: [] }>;
}>;
