import { DirectInvokable, EmptyObject } from '../integration';

export type DebuggerKeyword = DirectInvokable<{
  (args: EmptyObject): void;
}>;
