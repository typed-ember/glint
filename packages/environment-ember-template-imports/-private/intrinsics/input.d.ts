import { ComponentLike } from '@glint/template';

export interface CheckboxInputArgs {
  type: 'checkbox';
  checked?: boolean | undefined;
}

export interface TextInputArgs {
  type?: string | undefined;
  value?: string | null | undefined;
  enter?: ((value: string, event: KeyboardEvent) => void) | undefined;
  'insert-newline'?: ((value: string, event: KeyboardEvent) => void) | undefined;
  'escape-press'?: ((value: string, event: KeyboardEvent) => void) | undefined;
  'focus-in'?: ((value: string, event: FocusEvent) => void) | undefined;
  'focus-out'?: ((value: string, event: FocusEvent) => void) | undefined;
  'key-down'?: ((value: string, event: KeyboardEvent) => void) | undefined;
  'key-press'?: ((value: string, event: KeyboardEvent) => void) | undefined;
  'key-up'?: ((value: string, event: KeyboardEvent) => void) | undefined;
}

export type InputComponent = ComponentLike<{
  Args: { Named: CheckboxInputArgs | TextInputArgs };
  Element: HTMLInputElement;
}>;
