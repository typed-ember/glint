import { ComponentReturn, DirectInvokable } from '../integration';

export type EachKeyword = DirectInvokable<{
  <T>(args: { key?: string }, items: readonly T[]): ComponentReturn<{
    default: [T, number];
    else?: [];
  }>;
}>;
