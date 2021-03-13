import { AcceptsBlocks } from '@glint/template/-private';
import { DirectInvokable } from '@glint/template/-private/resolution';
import { EmptyObject } from '@glint/template/-private/signature';

export interface TextareaArgs {
  value?: string;
  enter?: (value: string, event: KeyboardEvent) => void;
  'insert-newline'?: (value: string, event: KeyboardEvent) => void;
  'escape-press'?: (value: string, event: KeyboardEvent) => void;
  'focus-in'?: (value: string, event: FocusEvent) => void;
  'focus-out'?: (value: string, event: FocusEvent) => void;
  'key-press'?: (value: string, event: KeyboardEvent) => void;
}

export type TextareaComponent = DirectInvokable<{
  (args: TextareaArgs): AcceptsBlocks<EmptyObject>;
}>;
