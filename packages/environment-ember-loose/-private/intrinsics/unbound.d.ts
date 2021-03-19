import { DirectInvokable, EmptyObject } from '@glint/template/-private/integration';

export type UnboundKeyword = DirectInvokable<{
  <T>(args: EmptyObject, value: T): T;
}>;
