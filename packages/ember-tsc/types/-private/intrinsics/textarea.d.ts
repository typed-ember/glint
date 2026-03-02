import { ComponentLike } from '@glint/template';

export interface TextareaArgs {
  value?: string | null | undefined;
  enter?: ((value: string, event: KeyboardEvent) => void) | undefined;
  'insert-newline'?: ((value: string, event: KeyboardEvent) => void) | undefined;
  'escape-press'?: ((value: string, event: KeyboardEvent) => void) | undefined;
  'focus-in'?: ((value: string, event: FocusEvent) => void) | undefined;
  'focus-out'?: ((value: string, event: FocusEvent) => void) | undefined;
  'key-press'?: ((value: string, event: KeyboardEvent) => void) | undefined;
}

export type TextareaComponent = ComponentLike<{
  Args: TextareaArgs;
  Element: HTMLTextAreaElement;
}>;
