import { on as onDefinition } from '@glimmerx/modifier';
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

  on({}, 'unknown', (event) => {
    expectTypeOf(event).toEqualTypeOf<Event>();
  });

  on({}, 'click', (event) => {
    expectTypeOf(event).toEqualTypeOf<MouseEvent>();
  });

  applyModifier(
    new HTMLElement(),
    on({}, 'click', () => {})
  );
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

  applyModifier(
    new HTMLImageElement(),
    fetchImageData({}, (data) => console.log(data))
  );

  applyModifier(
    // @ts-expect-error: invalid element type
    new HTMLDivElement(),
    fetchImageData({}, (data) => console.log(data))
  );
}
