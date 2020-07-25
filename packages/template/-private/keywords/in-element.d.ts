import { AcceptsBlocks } from '../signature';

export default interface InElementKeyword {
  (args: { insertBefore?: null }, element: Element): AcceptsBlocks<{ default: [] }>;
}
