import { NoNamedArgs, AcceptsBlocks } from '../signature';

export default interface WithKeyword {
  <T>(args: NoNamedArgs, value: T): AcceptsBlocks<{
    default: [T];
    inverse?: [];
  }>;
}
