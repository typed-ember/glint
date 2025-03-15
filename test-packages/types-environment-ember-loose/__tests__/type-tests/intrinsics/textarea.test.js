import { expectTypeOf } from 'expect-type';
import { applySplattributes, emitComponent, Globals, NamedArgsMarker, resolve, } from '@glint/environment-ember-loose/-private/dsl';
let textarea = resolve(Globals['textarea']);
let Textarea = resolve(Globals['Textarea']);
// Both casings have the same signature
expectTypeOf(textarea).toEqualTypeOf(Textarea);
Textarea();
Textarea({ value: 'hello', ...NamedArgsMarker });
Textarea({ value: undefined, ...NamedArgsMarker });
Textarea({ value: null, ...NamedArgsMarker });
// Ensure we can apply <textarea>-specific attributes
{
    const __glintY__ = emitComponent(Textarea());
    applySplattributes(new HTMLTextAreaElement(), __glintY__.element);
}
// Event handlers
Textarea({
    enter: (value, event) => {
        expectTypeOf(value).toEqualTypeOf();
        expectTypeOf(event).toEqualTypeOf();
    },
    'insert-newline': (value, event) => {
        expectTypeOf(value).toEqualTypeOf();
        expectTypeOf(event).toEqualTypeOf();
    },
    'escape-press': (value, event) => {
        expectTypeOf(value).toEqualTypeOf();
        expectTypeOf(event).toEqualTypeOf();
    },
    'focus-in': (value, event) => {
        expectTypeOf(value).toEqualTypeOf();
        expectTypeOf(event).toEqualTypeOf();
    },
    'focus-out': (value, event) => {
        expectTypeOf(value).toEqualTypeOf();
        expectTypeOf(event).toEqualTypeOf();
    },
    'key-press': (value, event) => {
        expectTypeOf(value).toEqualTypeOf();
        expectTypeOf(event).toEqualTypeOf();
    },
    ...NamedArgsMarker,
});
//# sourceMappingURL=textarea.test.js.map