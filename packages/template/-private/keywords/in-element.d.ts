import { DirectInvokable } from '../resolution';
import { AcceptsBlocks } from '../signature';

export type InElementKeyword = DirectInvokable<{
  (args: { insertBefore?: null }, element: Element): AcceptsBlocks<{ default: [] }>;
}>;
