import { on as onImport } from '@ember/modifier';
import { NamedArgsMarker, applyModifier, resolve } from '@glint/ember-tsc/-private/dsl';
import { expectTypeOf } from 'expect-type';

const on = resolve(onImport);
const el = document.createElement('div');

on(el, 'click', () => {}, {
  // @ts-expect-error: extra named arg
  foo: 'bar',
  ...NamedArgsMarker,
});

// @ts-expect-error: missing positional arg
on(el, 'click');

// @ts-expect-error: extra positional arg
on(el, 'click', () => {}, 'hello');

on(el, 'scroll', () => {}, { capture: true, once: true, passive: true, ...NamedArgsMarker });

// `event` is the intersection of the DOM event type and a narrowed
// `currentTarget`; assignability to the base event type is preserved.
on(el, 'unknown', (event) => {
  expectTypeOf(event).toExtend<Event>();
});

on(el, 'click', (event) => {
  expectTypeOf(event).toExtend<PointerEvent>();
});

on(el, 'keyup', (event) => {
  expectTypeOf(event).toExtend<KeyboardEvent>();
});

applyModifier(on(el, 'click', () => {}));

applyModifier(on(new SVGRectElement(), 'click', () => {}));

applyModifier(on(new Element(), 'click', () => {}));

// A handler can be typed with a narrowed `currentTarget` so that property
// accesses in the body need no `as` cast.
const narrowedHandler = (event: SubmitEvent & { currentTarget: HTMLFormElement }): void => {
  new FormData(event.currentTarget);
};
on(document.createElement('form'), 'submit', narrowedHandler);

// With no handler annotation, `currentTarget` is inferred from the element.
on(document.createElement('form'), 'submit', (event) => {
  expectTypeOf(event.currentTarget).toExtend<HTMLFormElement>();
});

// A handler whose `currentTarget` claims an element type incompatible with
// the element the modifier is on is rejected at the element argument.
const wrongHandler = (event: SubmitEvent & { currentTarget: HTMLInputElement }): void => {
  void event;
};
// @ts-expect-error: handler claims HTMLInputElement, modifier is on <form>
on(document.createElement('form'), 'submit', wrongHandler);

// Existing handlers typed with just the DOM event continue to type-check.
const looseHandler = (event: SubmitEvent): void => {
  void event;
};
on(document.createElement('form'), 'submit', looseHandler);
