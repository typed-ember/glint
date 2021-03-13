import { DirectInvokable } from '@glint/template/-private/resolution';
import { EmptyObject } from '@glint/template/-private/signature';

export type OutletKeyword = DirectInvokable<{
  (args: EmptyObject, name?: string): void;
}>;
