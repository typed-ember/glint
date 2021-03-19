import { DirectInvokable, EmptyObject } from '../integration';

export type HasBlockParamsKeyword = DirectInvokable<{
  (args: EmptyObject, blockName?: string): boolean;
}>;
