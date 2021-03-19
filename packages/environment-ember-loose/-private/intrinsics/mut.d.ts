import { DirectInvokable, EmptyObject } from '@glint/template/-private/integration';

declare const Mut: unique symbol;

export type Mut<T> = { [Mut]: (value: T) => void };

export type MutKeyword = DirectInvokable<{
  <T>(args: EmptyObject, value: T): Mut<T>;
}>;
