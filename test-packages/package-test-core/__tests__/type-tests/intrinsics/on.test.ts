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

on(el, 'unknown', (event) => {
  expectTypeOf(event).toEqualTypeOf<Event>();
});

on(el, 'click', (event) => {
  expectTypeOf(event).toEqualTypeOf<PointerEvent>();
});

on(el, 'keyup', (event) => {
  expectTypeOf(event).toEqualTypeOf<KeyboardEvent>();
});

applyModifier(on(el, 'click', () => {}));

applyModifier(on(new SVGRectElement(), 'click', () => {}));

applyModifier(on(new Element(), 'click', () => {}));
