import { HelperLike } from '@glint/template';

export type OutletKeyword = HelperLike<{
  Args: {
    Positional: [name?: string];
  };
  Return: void;
}>;
