import { HelperLike } from '@glint/template';

declare const Mut: unique symbol;

export type Mut<T> = { [Mut]: (value: T) => void };

export type MutKeyword = abstract new <T>() => InstanceType<
  HelperLike<{
    Args: {
      Positional: [value: T];
    };
    Return: Mut<T>;
  }>
>;
