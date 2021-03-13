import { DirectInvokable } from '@glint/template/-private/resolution';
import { EmptyObject } from '@glint/template/-private/signature';

declare const Mut: unique symbol;

export type Mut<T> = { [Mut]: (value: T) => void };

export type MutKeyword = DirectInvokable<{
  <T>(args: EmptyObject, value: T): Mut<T>;
}>;
