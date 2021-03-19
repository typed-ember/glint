import { DirectInvokable, EmptyObject } from '../integration';

export type HasBlockKeyword = DirectInvokable<{
  (args: EmptyObject, blockName?: string): boolean;
}>;
