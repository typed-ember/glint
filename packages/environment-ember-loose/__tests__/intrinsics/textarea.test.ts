import { expectTypeOf } from 'expect-type';
import {
  applySplattributes,
  ElementForComponent,
  Globals,
  resolve,
} from '@glint/environment-ember-loose/-private/dsl';

let textarea = resolve(Globals['textarea']);
let Textarea = resolve(Globals['Textarea']);

// Both casings have the same signature
expectTypeOf(textarea).toEqualTypeOf(Textarea);

Textarea({}), {};
Textarea({ value: 'hello' });

// Ensure we can apply <textarea>-specific attributes
applySplattributes<HTMLTextAreaElement, ElementForComponent<Globals['Textarea']>>();

// Event handlers
Textarea({
  enter: (value, event) => {
    expectTypeOf(value).toEqualTypeOf<string>();
    expectTypeOf(event).toEqualTypeOf<KeyboardEvent>();
  },
  'insert-newline': (value, event) => {
    expectTypeOf(value).toEqualTypeOf<string>();
    expectTypeOf(event).toEqualTypeOf<KeyboardEvent>();
  },
  'escape-press': (value, event) => {
    expectTypeOf(value).toEqualTypeOf<string>();
    expectTypeOf(event).toEqualTypeOf<KeyboardEvent>();
  },
  'focus-in': (value, event) => {
    expectTypeOf(value).toEqualTypeOf<string>();
    expectTypeOf(event).toEqualTypeOf<FocusEvent>();
  },
  'focus-out': (value, event) => {
    expectTypeOf(value).toEqualTypeOf<string>();
    expectTypeOf(event).toEqualTypeOf<FocusEvent>();
  },
  'key-press': (value, event) => {
    expectTypeOf(value).toEqualTypeOf<string>();
    expectTypeOf(event).toEqualTypeOf<KeyboardEvent>();
  },
});
