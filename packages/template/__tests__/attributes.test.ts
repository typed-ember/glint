import { expectTypeOf } from 'expect-type';
import {
  template,
  resolve,
  ResolveContext,
  applyModifier,
  applySplattributes,
  applyAttributes,
  emitElement,
  emitComponent,
  bindBlocks,
} from '../-private/dsl';
import { BoundModifier, DirectInvokable, EmptyObject } from '../-private/integration';
import TestComponent from './test-component';

declare const imageModifier: DirectInvokable<
  (args: EmptyObject) => BoundModifier<HTMLImageElement>
>;

declare const anchorModifier: DirectInvokable<
  (args: EmptyObject) => BoundModifier<HTMLAnchorElement>
>;

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
  public static template = template(function (𝚪: ResolveContext<MyComponent>) {
    expectTypeOf(𝚪.element).toEqualTypeOf<HTMLImageElement>();

    emitElement('img', (ctx) => {
      expectTypeOf(ctx.element).toEqualTypeOf<HTMLImageElement>();

      applyModifier(ctx.element, resolve(imageModifier)({}));
      applySplattributes(𝚪.element, ctx.element);
    });
  });
}

// `emitElement` type resolution
emitElement('img', (el) => expectTypeOf(el).toEqualTypeOf<{ element: HTMLImageElement }>());
emitElement('unknown', (el) => expectTypeOf(el).toEqualTypeOf<{ element: Element }>());

/**
 * ```handlebars
 * <MyComponent ...attributes foo="bar" />
 * ```
 */
emitComponent(resolve(MyComponent)({}), (component) => {
  bindBlocks(component.blockParams, {});
  applySplattributes(new HTMLImageElement(), component.element);
  applyAttributes(component.element, { foo: 'bar' });
});

/**
 * ```handlebars
 * <SVGElementComponent ...attributes />
 * ```
 */
emitComponent(resolve(SVGElementComponent)({}), (component) => {
  bindBlocks(component.blockParams, {});
  applySplattributes(new SVGSVGElement(), component.element);
});

/**
 * ```handlebars
 * <svg ...attributes></svg>
 * ```
 */
emitElement('svg', (ctx) => applySplattributes(new SVGSVGElement(), ctx.element));

/**
 * ```handlebars
 * <a {{anchorModifier}}></a>
 * ```
 */
emitElement('a', (ctx) => {
  expectTypeOf(ctx).toEqualTypeOf<{ element: HTMLAnchorElement & SVGAElement }>();
  applyModifier(ctx.element, resolve(anchorModifier)({}));
});

// Error conditions:

emitElement('unknown', (element) => {
  applySplattributes(
    new HTMLFormElement(),
    // @ts-expect-error: Trying to pass splattributes specialized for another element
    element
  );
});

emitComponent(resolve(MyComponent)({}), (component) => {
  applySplattributes(
    new HTMLFormElement(),
    // @ts-expect-error: Trying to pass splattributes specialized for another element
    component.element
  );
});

emitComponent(resolve(TestComponent)({}), (component) => {
  applySplattributes(
    new HTMLUnknownElement(),
    // @ts-expect-error: Trying to apply splattributes to a component with no root element
    component.element
  );
});

emitComponent(resolve(SVGAElementComponent)({}), (component) => {
  applySplattributes(
    new HTMLAnchorElement(),
    // @ts-expect-error: Trying to apply splattributes for an HTML <a> to an SVG <a>
    component.element
  );
});

emitElement('div', (div) =>
  applyModifier(
    // @ts-expect-error: `imageModifier` expects an `HTMLImageElement`
    div,
    resolve(imageModifier)({})
  )
);

emitComponent(resolve(GenericElementComponent)({}), (component) => {
  applyModifier(
    // @ts-expect-error: `imageModifier` expects an `HTMLImageElement`
    component.element,
    resolve(imageModifier)({})
  );
});

emitComponent(resolve(TestComponent)({}), (component) => {
  applyModifier(
    // @ts-expect-error: Trying to apply a modifier to a component with no root element
    component.element,
    resolve(imageModifier)({})
  );
});

emitComponent(resolve(SVGAElementComponent)({}), (component) => {
  applyModifier(
    // @ts-expect-error: Can't apply modifier for HTML <a> to SVG <a>
    component.element,
    resolve(anchorModifier)({})
  );
});

emitComponent(resolve(TestComponent)({}), (component) => {
  applyAttributes(
    // @ts-expect-error: Trying to apply attributes to a component with no root element
    component.element,
    { foo: 'bar' }
  );
});
