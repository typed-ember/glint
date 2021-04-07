import { AcceptsBlocks, EmptyObject, Invokable } from '@glint/template/-private/integration';

export interface TextareaArgs {
  value?: string;
  enter?: (value: string, event: KeyboardEvent) => void;
  'insert-newline'?: (value: string, event: KeyboardEvent) => void;
  'escape-press'?: (value: string, event: KeyboardEvent) => void;
  'focus-in'?: (value: string, event: FocusEvent) => void;
  'focus-out'?: (value: string, event: FocusEvent) => void;
  'key-press'?: (value: string, event: KeyboardEvent) => void;
}

export type TextareaComponent = new () => Invokable<
  (args: TextareaArgs) => AcceptsBlocks<EmptyObject, HTMLTextAreaElement>
>;
