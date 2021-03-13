import { DirectInvokable } from '@glint/template/-private/resolution';
import { EmptyObject } from '@glint/template/-private/signature';

export type UnboundKeyword = DirectInvokable<{
  <T>(args: EmptyObject, value: T): T;
}>;
