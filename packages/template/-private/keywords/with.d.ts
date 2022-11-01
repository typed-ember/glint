import { ComponentReturn, DirectInvokable, EmptyObject } from '../integration';

export type WithKeyword = DirectInvokable<{
  <T>(args: EmptyObject, value: T): ComponentReturn<{
    default: [T];
    else?: [];
  }>;
}>;
