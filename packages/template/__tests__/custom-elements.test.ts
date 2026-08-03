import { expectTypeOf } from 'expect-type';
import {
  applyAttributes,
  applyModifier,
  applySplattributes,
  applyTagAttributes,
  emitComponent,
  emitElement,
  resolve,
} from '../-private/dsl';
import type {
  AttributesForElement,
  AttributesForTagName,
  ElementForTagName,
  WithDataAttributes,
} from '../-private/dsl';
import type { AttrValue } from '../-private/index';
import { ModifierLike } from '../-private/index';
import TestComponent from './test-component';
import {
  RegisteredElement,
  RegisteredElementWithAttrs,
  RegisteredElementAttributes,
} from './custom-elements-registry';

declare const registeredElementModifier: ModifierLike<{ Element: RegisteredElement }>;

/**
 * Baseline: attributes for built-in elements are resolved from the tag name.
 *
 * ```handlebars
 * <div class="x" data-foo="1" nope="x"></div>
 * ```
 */
{
  const div = emitElement('div');

  expectTypeOf<AttributesForTagName<'div'>>().toEqualTypeOf<AttributesForElement<HTMLDivElement>>();

  applyTagAttributes(div, {
    class: 'x',
    role: 'button',
    'data-foo': '1',
    // @ts-expect-error: unknown attribute for <div>
    nope: 'x',
  });
}

/**
 * A registered element type (without registered attributes) gives the element
 * a real type — so modifiers and splattributes are checked — while attributes
 * remain unchecked.
 *
 * ```handlebars
 * <registered-element anything="goes" {{registeredElementModifier}}></registered-element>
 * ```
 */
{
  const el = emitElement('registered-element');

  expectTypeOf(el.name).toEqualTypeOf<'registered-element'>();
  expectTypeOf(el.element).toEqualTypeOf<RegisteredElement>();
  expectTypeOf<ElementForTagName<'registered-element'>>().toEqualTypeOf<RegisteredElement>();
  expectTypeOf(el.attributes).toEqualTypeOf<Record<string, AttrValue>>();

  applyTagAttributes(el, { anything: 'goes', whatever: 123 });

  applyModifier(resolve(registeredElementModifier)(el.element));

  const div = emitElement('div');
  applyModifier(
    resolve(registeredElementModifier)(
      // @ts-expect-error: `registeredElementModifier` expects a `RegisteredElement`
      div.element,
    ),
  );
}

/**
 * A fully registered custom element has its attributes strictly checked.
 *
 * ```handlebars
 * <registered-element-with-attrs prop-num={{123}} prop-str="hello"></registered-element-with-attrs>
 * ```
 */
{
  const el = emitElement('registered-element-with-attrs');

  expectTypeOf(el.element).toEqualTypeOf<RegisteredElementWithAttrs>();
  expectTypeOf(el.attributes).toEqualTypeOf<WithDataAttributes<RegisteredElementAttributes>>();

  applyTagAttributes(el, {
    'prop-num': 123,
    'prop-str': 'hello',
    'data-test-id': 'ok',
  });

  applyTagAttributes(el, {
    // @ts-expect-error: 'prop-num' expects a number
    'prop-num': 'wrong',
    // @ts-expect-error: 'prop-str' expects a string
    'prop-str': 123,
  });

  applyTagAttributes(el, {
    // @ts-expect-error: unknown attribute
    'prop-nope': 'x',
  });
}

/**
 * Registering only attributes still checks them; the element type just stays
 * the generic `Element`.
 *
 * ```handlebars
 * <attrs-only-element count={{3}}></attrs-only-element>
 * ```
 */
{
  const el = emitElement('attrs-only-element');

  expectTypeOf(el.element).toEqualTypeOf<Element>();

  applyTagAttributes(el, { count: 3 });

  applyTagAttributes(el, {
    // @ts-expect-error: 'count' expects a number
    count: 'wrong',
  });

  applyTagAttributes(el, {
    // @ts-expect-error: unknown attribute
    other: 'x',
  });
}

/**
 * A component whose signature `Element` is a registered custom element gets
 * the same attribute checking, via reverse lookup from the element type.
 *
 * ```handlebars
 * <CustomElementComponent prop-num={{123}} ...attributes />
 * ```
 */
class CustomElementComponent extends TestComponent<{ Element: RegisteredElementWithAttrs }> {}
{
  const component = emitComponent(resolve(CustomElementComponent)());

  applyAttributes(component.element, { 'prop-num': 123, 'data-test-id': 'ok' });

  applyAttributes(component.element, {
    // @ts-expect-error: 'prop-num' expects a number
    'prop-num': 'wrong',
  });

  applySplattributes(new RegisteredElementWithAttrs(), component.element);
}

/**
 * An *unregistered* `HTMLElement` subclass used as a signature `Element`
 * accepts arbitrary attributes. (Previously the element-type lookup produced
 * `never`, making it impossible to pass any attribute at all.)
 */
class UnregisteredElement extends HTMLElement {
  declare unregisteredElementProp: number;
}
class UnregisteredElementComponent extends TestComponent<{ Element: UnregisteredElement }> {}
{
  const component = emitComponent(resolve(UnregisteredElementComponent)());

  applyAttributes(component.element, { anything: 'goes', 'data-foo': 'ok' });
}
