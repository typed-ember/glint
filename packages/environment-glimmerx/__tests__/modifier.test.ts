import { on as onDefinition } from '@glint/environment-glimmerx/modifier';
import { resolve, applyModifier } from '@glint/environment-glimmerx/-private/dsl';
import { expectTypeOf } from 'expect-type';

// Built-in modifier: `on`
{
  const on = resolve(onDefinition);

  // @ts-expect-error: extra named arg
  on({ foo: 'bar' }, 'click', () => {});

  // @ts-expect-error: missing positional arg
  on({}, 'click');

  // @ts-expect-error: extra positional arg
  on({}, 'click', () => {}, 'hello');

  // @ts-expect-error: invalid event name
  on({}, 'unknown', () => {});

  on({}, 'click', (event) => {
    expectTypeOf(event).toEqualTypeOf<MouseEvent>();
  });

  expectTypeOf(applyModifier(on({}, 'click', () => {}))).toEqualTypeOf<void>();
}
