import { AcceptsBlocks, DirectInvokable, EmptyObject } from '@glint/template/-private/integration';

export interface CheckboxInputArgs {
  type: 'checkbox';
  checked?: boolean;
}

export interface TextInputArgs {
  type?: string;
  value?: string;
  enter?: (value: string, event: KeyboardEvent) => void;
  'insert-newline'?: (value: string, event: KeyboardEvent) => void;
  'escape-press'?: (value: string, event: KeyboardEvent) => void;
  'focus-in'?: (value: string, event: FocusEvent) => void;
  'focus-out'?: (value: string, event: FocusEvent) => void;
  'key-down'?: (value: string, event: KeyboardEvent) => void;
  'key-press'?: (value: string, event: KeyboardEvent) => void;
  'key-up'?: (value: string, event: KeyboardEvent) => void;
}

export type InputComponent = DirectInvokable<{
  (args: CheckboxInputArgs | TextInputArgs): AcceptsBlocks<EmptyObject>;
}>;
