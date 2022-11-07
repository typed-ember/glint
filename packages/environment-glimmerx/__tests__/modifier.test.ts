import { on as onDefinition } from '@glimmerx/modifier';
import { resolve, applyModifier, NamedArgsMarker } from '@glint/environment-glimmerx/-private/dsl';
import { expectTypeOf } from 'expect-type';

// Built-in modifier: `on`
{
  const el = new HTMLDivElement();
  const on = resolve(onDefinition);

  on(el, 'click', () => {}, {
    // @ts-expect-error: extra named arg
    foo: 'bar',
    ...NamedArgsMarker,
  });

  // @ts-expect-error: missing positional arg
  on(el, 'click');

  on(
    el,
    'click',
    () => {},
    // @ts-expect-error: extra positional arg
    'hello'
  );

  on(el, 'unknown', (event) => {
    expectTypeOf(event).toEqualTypeOf<Event>();
  });

  on(el, 'click', (event) => {
    expectTypeOf(event).toEqualTypeOf<MouseEvent>();
  });

  applyModifier(on(el, 'click', () => {}));
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

  applyModifier(fetchImageData(new HTMLImageElement(), (data) => console.log(data)));

  applyModifier(
    fetchImageData(
      // @ts-expect-error: invalid element type
      new HTMLDivElement(),
      (data) => console.log(data)
    )
  );
}
