import { expectTypeOf } from 'expect-type';
import { Globals, applyModifier, resolve } from '@glint/environment-ember-loose/-private/dsl';

const on = resolve(Globals['on']);

// @ts-expect-error: extra named arg
on({ foo: 'bar' }, 'click', () => {});

// @ts-expect-error: missing positional arg
on({}, 'click');

// @ts-expect-error: extra positional arg
on({}, 'click', () => {}, 'hello');

on({ capture: true, once: true, passive: true }, 'scroll', () => {});

on({}, 'unknown', (event) => {
  expectTypeOf(event).toEqualTypeOf<Event>();
});

on({}, 'click', (event) => {
  expectTypeOf(event).toEqualTypeOf<MouseEvent>();
});

on({}, 'keyup', (event) => {
  expectTypeOf(event).toEqualTypeOf<KeyboardEvent>();
});

applyModifier(
  new HTMLElement(),
  on({}, 'click', () => {})
);

applyModifier(
  new SVGRectElement(),
  on({}, 'click', () => {})
);

applyModifier(
  new Element(),
  on({}, 'click', () => {})
);
