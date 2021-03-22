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

// Custom modifier with a specific element type
{
  const fetchImageData = resolve(
    (element: HTMLImageElement, callback: (data: ImageData | undefined) => void): void => {
      let context = document.createElement('canvas').getContext('2d');
      context?.drawImage(element, 0, 0);
      callback(context?.getImageData(0, 0, element.naturalWidth, element.naturalHeight));
    }
  );

  applyModifier<HTMLImageElement>(fetchImageData({}, (data) => console.log(data)));

  // @ts-expect-error: invalid element type
  applyModifier<HTMLDivElement>(fetchImageData({}, (data) => console.log(data)));
}
