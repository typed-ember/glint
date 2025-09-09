import {
  applySplattributes,
  emitComponent,
  NamedArgsMarker,
  resolve,
} from '@glint/core/-private/dsl';
import { expectTypeOf } from 'expect-type';

// import TextArea from '@ember/component/text-area';
import { Input as InputImport } from '@ember/component';

let Input = resolve(InputImport);

Input();
Input({ value: 'hello', ...NamedArgsMarker });
Input({ type: 'text', value: 'hello', ...NamedArgsMarker });
Input({ type: 'text', value: undefined, ...NamedArgsMarker });
Input({ type: 'text', value: null, ...NamedArgsMarker });
Input({ type: 'checkbox', checked: true, ...NamedArgsMarker });

// NOTE: We allow all string types but, if it becomes easily possible, we should limit to valid HTMLInput types and disallow empty strings.
Input({ type: '', value: 'hello', ...NamedArgsMarker });
Input({ type: 'string', value: 'hello', ...NamedArgsMarker });

// Ensure we can apply <input>-specific attributes
{
  const __glintY__ = emitComponent(Input());
  applySplattributes(new HTMLInputElement(), __glintY__.element);
}

// @ts-expect-error: `checked` only works with `@type=checkbox`
Input({ type: 'text', checked: true, ...NamedArgsMarker });

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
  ...NamedArgsMarker,
});
