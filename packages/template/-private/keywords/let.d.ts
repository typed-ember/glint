import { ComponentReturn, DirectInvokable, EmptyObject } from '../integration';

export type LetKeyword = DirectInvokable<{
  <T extends unknown[]>(args: EmptyObject, ...values: T): ComponentReturn<{
    default: T;
  }>;
}>;
