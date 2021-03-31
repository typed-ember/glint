import { expectTypeOf } from 'expect-type';
import {
  template,
  resolve,
  invokeBlock,
  ResolveContext,
  ElementForTagName,
  applyModifier,
  applySplattributes,
  ElementForComponent,
  applyAttributes,
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

    applyModifier<ElementForTagName<'img'>>(resolve(imageModifier)({}));
    applySplattributes<typeof 𝚪.element, ElementForTagName<'img'>>();
  });
}

// `ElementForComponent`
expectTypeOf<ElementForComponent<typeof MyComponent>>().toEqualTypeOf<HTMLImageElement>();
expectTypeOf<ElementForComponent<typeof GenericElementComponent>>().toEqualTypeOf<HTMLElement>();
expectTypeOf<ElementForComponent<typeof SVGElementComponent>>().toEqualTypeOf<SVGSVGElement>();
expectTypeOf<ElementForComponent<typeof SVGAElementComponent>>().toEqualTypeOf<SVGAElement>();
expectTypeOf<ElementForComponent<typeof TestComponent>>().toEqualTypeOf<null>();

// `ElementForTagName`
expectTypeOf<ElementForTagName<'img'>>().toEqualTypeOf<HTMLImageElement>();
expectTypeOf<ElementForTagName<'unknown'>>().toEqualTypeOf<Element>();

/**
 * ```handlebars
 * <MyComponent ...attributes foo="bar" />
 * ```
 */
applySplattributes<ElementForTagName<'img'>, ElementForComponent<typeof MyComponent>>();
applySplattributes<ElementForTagName<'svg'>, ElementForComponent<typeof SVGElementComponent>>();
applySplattributes<SVGAElement, ElementForComponent<typeof SVGAElementComponent>>();
applyAttributes<ElementForComponent<typeof MyComponent>>({ foo: 'bar' });
invokeBlock(resolve(MyComponent)({}), {});

applyModifier<HTMLAnchorElement>(resolve(anchorModifier)({}));
applyModifier<ElementForTagName<'a'>>(resolve(anchorModifier)({}));

// Error conditions:

// @ts-expect-error: Trying to pass splattributes specialized for another element
applySplattributes<ElementForTagName<'form'>, ElementForTagName<'unknown'>>();
// @ts-expect-error: Trying to pass splattributes specialized for another element
applySplattributes<ElementForTagName<'form'>, ElementForComponent<typeof MyComponent>>();
// @ts-expect-error: Trying to apply splattributes to a component with no root element
applySplattributes<ElementForTagName<'unknown'>, ElementForComponent<typeof TestComponent>>();
// @ts-expect-error: Trying to apply splattributes for an HTML <a> to an SVG <a>
applySplattributes<HTMLAnchorElement, ElementForComponent<typeof SVGAElementComponent>>();

// @ts-expect-error: `imageModifier` expects an `HTMLImageElement`
applyModifier<HTMLDivElement>(resolve(imageModifier)({}));
// @ts-expect-error: `imageModifier` expects an `HTMLImageElement`d
applyModifier<ElementForComponent<typeof GenericElementComponent>>(resolve(imageModifier)({}));
// @ts-expect-error: Trying to apply a modifier to a component with no root element
applyModifier<ElementForComponent<typeof TestComponent>>(resolve(imageModifier)({}));
// @ts-expect-error: Can't apply modifier for HTML <a> to SVG <a>
applyModifier<SVGAElement>(resolve(anchorModifier)({}));

// @ts-expect-error: Trying to apply attributes to a component with no root element
applyAttributes<typeof TestComponent>({ foo: 'bar' });
