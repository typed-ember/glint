import { NoNamedArgs, AcceptsBlocks } from '../signature';

export default interface LetKeyword {
  <T extends unknown[]>(args: NoNamedArgs, ...values: T): AcceptsBlocks<{
    default: T;
  }>;
}
