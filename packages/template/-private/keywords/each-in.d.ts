import { NoNamedArgs, AcceptsBlocks } from '../signature';

export default interface EachInKeyword {
  <T>(args: NoNamedArgs, object: T): AcceptsBlocks<{
    default: [keyof T, T[keyof T]];
  }>;
}
