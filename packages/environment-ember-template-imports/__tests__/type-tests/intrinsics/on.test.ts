import {
  Globals,
  NamedArgsMarker,
  applyModifier,
  resolve,
} from '@glint/environment-ember-template-imports/-private/dsl';
import { expectTypeOf } from 'expect-type';

const on = resolve(Globals['on']);
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
  expectTypeOf(event).toEqualTypeOf<MouseEvent>();
});

on(el, 'keyup', (event) => {
  expectTypeOf(event).toEqualTypeOf<KeyboardEvent>();
});

applyModifier(on(el, 'click', () => {}));

applyModifier(on(new SVGRectElement(), 'click', () => {}));

applyModifier(on(new Element(), 'click', () => {}));
