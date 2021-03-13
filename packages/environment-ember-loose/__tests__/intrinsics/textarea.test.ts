import { expectTypeOf } from 'expect-type';
import { Globals, resolve } from '@glint/environment-ember-loose/types';

let textarea = resolve(Globals['textarea']);
let Textarea = resolve(Globals['Textarea']);

// Both casings have the same signature
expectTypeOf(textarea).toEqualTypeOf(Textarea);

Textarea({}), {};
Textarea({ value: 'hello' });

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
