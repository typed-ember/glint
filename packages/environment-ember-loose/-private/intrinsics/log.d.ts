import { HelperLike } from '@glint/template';

export type LogHelper = HelperLike<{
  Args: { Positional: unknown[] };
  Return: void;
}>;
