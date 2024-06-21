import { expectTypeOf } from 'expect-type';
import {
  templateForBackingValue,
  resolve,
  applyModifier,
  applySplattributes,
  applyAttributes,
  emitElement,
  emitComponent,
} from '../-private/dsl';
import TestComponent from './test-component';
import { htmlSafe } from '@ember/template';
import { ModifierLike } from '../-private/index';

declare const imageModifier: ModifierLike<{ Element: HTMLImageElement }>;
declare const anchorModifier: ModifierLike<{ Element: HTMLAnchorElement }>;

class GenericElementComponent extends TestComponent<{ Element: HTMLElement }> {}

class SVGElementComponent extends TestComponent<{ Element: SVGSVGElement }> {}
// The <a> tag exists in both HTML and SVG
class SVGAElementComponent extends TestComponent<{ Element: SVGAElement }> {}

class MyComponent extends TestComponent<{ Element: HTMLImageElement }> {
  /**
   * ```handlebars
   * <img ...attributes {{imageModifier}}>
   * ```
   */
  static {
    templateForBackingValue(this, function (𝚪) {
      expectTypeOf(𝚪.element).toEqualTypeOf<HTMLImageElement>();

      {
        const ctx = emitElement('img');
        expectTypeOf(ctx.element).toEqualTypeOf<HTMLImageElement>();

        applyModifier(resolve(imageModifier)(ctx.element));
        applySplattributes(𝚪.element, ctx.element);
      }
    });
  }
}

// `emitElement` type resolution
{
  const el = emitElement('img');
  expectTypeOf(el).toEqualTypeOf<{ element: HTMLImageElement }>();
}

{
  const el = emitElement('unknown');
  expectTypeOf(el).toEqualTypeOf<{ element: Element }>();
}

/**
 * ```handlebars
 * <MyComponent ...attributes foo="bar" />
 * ```
 */
{
  const component = emitComponent(resolve(MyComponent)());
  applySplattributes(new HTMLImageElement(), component.element);
  applyAttributes(component.element, { foo: 'bar' });
}

/**
 * ```handlebars
 * <SVGElementComponent ...attributes />
 * ```
 */
{
  const component = emitComponent(resolve(SVGElementComponent)());
  applySplattributes(new SVGSVGElement(), component.element);
}

/**
 * ```handlebars
 * <svg ...attributes></svg>
 * ```
 */
{
  const ctx = emitElement('svg');
  applySplattributes(new SVGSVGElement(), ctx.element);
}

/**
 * ```handlebars
 * <a {{anchorModifier}}></a>
 * ```
 */
{
  const ctx = emitElement('a');
  expectTypeOf(ctx).toEqualTypeOf<{ element: HTMLAnchorElement & SVGAElement }>();
  applyModifier(resolve(anchorModifier)(ctx.element));
}

// Error conditions:

{
  const element = emitElement('unknown');
  applySplattributes(
    new HTMLFormElement(),
    // @ts-expect-error: Trying to pass splattributes specialized for another element
    element,
  );
}

{
  const component = emitComponent(resolve(MyComponent)());
  applySplattributes(
    new HTMLFormElement(),
    // @ts-expect-error: Trying to pass splattributes specialized for another element
    component.element,
  );
}

{
  const component = emitComponent(resolve(TestComponent)());
  applySplattributes(
    new HTMLUnknownElement(),
    // @ts-expect-error: Trying to apply splattributes to a component with no root element
    component.element,
  );
}

{
  const component = emitComponent(resolve(SVGAElementComponent)());
  applySplattributes(
    new HTMLAnchorElement(),
    // @ts-expect-error: Trying to apply splattributes for an HTML <a> to an SVG <a>
    component.element,
  );
}

{
  const div = emitElement('div');

  applyModifier(
    resolve(imageModifier)(
      // @ts-expect-error: `imageModifier` expects an `HTMLImageElement`
      div.element,
    ),
  );
}

{
  const component = emitComponent(resolve(GenericElementComponent)());
  applyModifier(
    resolve(imageModifier)(
      // @ts-expect-error: `imageModifier` expects an `HTMLImageElement`
      component.element,
    ),
  );
}

{
  const component = emitComponent(resolve(TestComponent)());
  applyModifier(
    resolve(imageModifier)(
      // @ts-expect-error: Trying to apply a modifier to a component with no root element
      component.element,
    ),
  );
}

{
  const component = emitComponent(resolve(SVGAElementComponent)());
  applyModifier(
    resolve(anchorModifier)(
      // @ts-expect-error: Can't apply modifier for HTML <a> to SVG <a>
      component.element,
    ),
  );
}

{
  const component = emitComponent(resolve(TestComponent)());
  applyAttributes(
    // @ts-expect-error: Trying to apply attributes to a component with no root element
    component.element,
    { foo: 'bar' },
  );
}

{
  applyAttributes(document.createElement('div'), {
    string: 'ok',
    safeString: htmlSafe('ok'),
    number: 123,
    bool: false,
    null: null,
    undefined: undefined,
    // @ts-expect-error: setting a `void` return as an attr makes no sense
    nothing: undefined as void,
    // @ts-expect-error: DOM nodes aren't valid values
    div: document.createElement('div'),
  });
}
