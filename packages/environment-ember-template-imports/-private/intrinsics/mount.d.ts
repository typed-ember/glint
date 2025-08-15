import { HelperLike } from '@glint/template';

export type MountKeyword = HelperLike<{
  Args: {
    Positional: [engine: string];
    Named: { model?: unknown };
  };
  Return: void;
}>;
