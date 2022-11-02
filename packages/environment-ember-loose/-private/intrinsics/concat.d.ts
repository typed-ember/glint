import { HelperLike } from '@glint/template';

export type ConcatHelper = HelperLike<{
  Args: { Positional: unknown[] };
  Return: string;
}>;
