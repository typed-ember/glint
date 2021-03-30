import { expectTypeOf } from 'expect-type';
import {
  applySplattributes,
  ElementForComponent,
  Globals,
  resolve,
} from '@glint/environment-ember-loose/-private/dsl';

let input = resolve(Globals['input']);
let Input = resolve(Globals['Input']);

// Both casings have the same signature
expectTypeOf(input).toEqualTypeOf(Input);

Input({}), {};
Input({ value: 'hello' });
Input({ type: 'string', value: 'hello' });
Input({ type: 'checkbox', checked: true });

// Ensure we can apply <input>-specific attributes
applySplattributes<HTMLInputElement, ElementForComponent<Globals['Input']>>();

// @ts-expect-error: `checked` only works with `@type=checkbox`
Input({ checked: true });

// @ts-expect-error: `checked` only works with `@type=checkbox`
Input({ type: 'text', checked: true });

// Event handlers
Input({
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
  'key-down': (value, event) => {
    expectTypeOf(value).toEqualTypeOf<string>();
    expectTypeOf(event).toEqualTypeOf<KeyboardEvent>();
  },
  'key-press': (value, event) => {
    expectTypeOf(value).toEqualTypeOf<string>();
    expectTypeOf(event).toEqualTypeOf<KeyboardEvent>();
  },
  'key-up': (value, event) => {
    expectTypeOf(value).toEqualTypeOf<string>();
    expectTypeOf(event).toEqualTypeOf<KeyboardEvent>();
  },
});
