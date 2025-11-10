import '@glint/template';
import { htmlSafe } from '@ember/template';
import { expectTypeOf } from 'expect-type';
import {
  applyAttributes,
  applyModifier,
  applySplattributes,
  AttributesForTagName,
  emitComponent,
  emitElement,
  resolve,
  templateForBackingValue,
  WithDataAttributes,
} from '../-private/dsl';
import { ModifierLike } from '../-private/index';
import TestComponent from './test-component';

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
    templateForBackingValue(this, function (__glintRef__) {
      expectTypeOf(__glintRef__.element).toEqualTypeOf<HTMLImageElement>();

      {
        const ctx = emitElement('img');
        expectTypeOf(ctx.element).toEqualTypeOf<HTMLImageElement>();

        applyModifier(resolve(imageModifier)(ctx.element));
        applySplattributes(__glintRef__.element, ctx.element);
        applyAttributes(__glintRef__.element, {
          src: '',
          dir: '',
          'data-test-id': '',
          'data-random': 2,
          // @ts-expect-error: this should error
          other: '',
        });
      }
    });
  }
}

// `emitElement` type resolution
{
  const el = emitElement('img');
  expectTypeOf(el.element).toEqualTypeOf<HTMLImageElement>();
  expectTypeOf(el.name).toEqualTypeOf<'img'>();
  expectTypeOf(el.attributes).toEqualTypeOf<AttributesForTagName<`img`>>();
}

{
  const el = emitElement('customelement');
  expectTypeOf(el.element).toEqualTypeOf<Element>();
  expectTypeOf(el.name).toEqualTypeOf<'customelement'>();
  expectTypeOf(el.attributes).toEqualTypeOf<WithDataAttributes<HTMLElementAttributes>>();
}

class RegisteredCustomElement extends HTMLElement {
  declare propNum: number;
  declare propStr: string;
}

declare global {
  interface GlintCustomElementMap {
    'registered-custom-element': RegisteredCustomElement;
    'explicit-attributes': RegisteredCustomElement;
  }
  interface GlintTagNameAttributesMap {
    'explicit-attributes': { propNum: number; propStr: string };
  }
}

{
  const el = emitElement('registered-custom-element');
  expectTypeOf(el.element).toEqualTypeOf<RegisteredCustomElement>();
  expectTypeOf(el.name).toEqualTypeOf<'registered-custom-element'>();
  expectTypeOf(el.attributes).toEqualTypeOf<WithDataAttributes<HTMLElementAttributes>>();

  const el2 = emitElement('explicit-attributes');
  expectTypeOf(el2.element).toEqualTypeOf<RegisteredCustomElement>();
  expectTypeOf(el2.name).toEqualTypeOf<'explicit-attributes'>();
  expectTypeOf(el2.attributes).toEqualTypeOf<
    WithDataAttributes<{ propNum: number; propStr: string }>
  >();
}

/**
 * ```handlebars
 * <MyComponent ...attributes foo="bar" />
 * ```
 */
{
  const component = emitComponent(resolve(MyComponent)());
  applySplattributes(new HTMLImageElement(), component.element);
  applyAttributes(component.element, { src: 'bar' });
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
 * <math ...attributes></svg>
 * ```
 */
{
  const ctx = emitElement('math');
  applySplattributes(new MathMLElement(), ctx.element);
}

/**
 * ```handlebars
 * <a {{anchorModifier}}></a>
 * ```
 */
{
  const ctx = emitElement('a');
  expectTypeOf(ctx.element).toEqualTypeOf<HTMLAnchorElement>();
  expectTypeOf(ctx.name).toEqualTypeOf<'a'>();
  expectTypeOf(ctx.attributes).toEqualTypeOf<WithDataAttributes<HTMLAnchorElementAttributes>>();
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
    dir: 'ok',
    name: htmlSafe('ok'),
    src: 123,
    border: false,
    'aria-activedescendant': null,
    'aria-atomic': undefined,
    // @ts-expect-error: setting a `void` return as an attr makes no sense
    'aria-autocomplete': undefined as void,
    // @disabled-ts-expect-error: DOM nodes aren't valid values
    allowusermedia: document.createElement('div'),
  });
}

// Properties
{
  applyAttributes(document.createElement('input'), {
    indeterminate: true,
  });
}

{
  applyAttributes(document.createElement('input'), {
    // @ts-expect-error: properties are typed, and indeterminate must be a bool
    indeterminate: 'true',
  });
}

{
  applyAttributes(document.createElement('textarea'), {
    value: 'ok',
  });
}

{
  applyAttributes(document.createElement('select'), {
    value: 'ok',
    length: 10,
  });
}

{
  applyAttributes(document.createElement('select'), {
    // @ts-expect-error: properties are typed, and indeterminate must be a number
    length: '10',
  });
}

{
  applyAttributes(new SVGSVGElement(), {
    xmlns: 'ok',
  });
}

{
  applyAttributes(new SVGSVGElement(), {
    role: 'presentation',
  });
}

{
  applyAttributes(new SVGSVGElement(), {
    title: 'My Icon',
  });
}

{
  applyAttributes(new SVGSVGElement(), {
    title: 'Icon',
    role: 'img',
    tabindex: '0',
  });
}
