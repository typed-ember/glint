import { Invokable } from '../resolution';
import { AcceptsBlocks } from '../signature';

export type InElementKeyword = Invokable<{
  (args: { insertBefore?: null }, element: Element): AcceptsBlocks<{ default: [] }>;
}>;
