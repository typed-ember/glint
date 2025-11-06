import { expectTypeOf } from 'expect-type';
import {
  emitElement,
  applyAttributes,
  AttributesForElement,
  CustomElementLookup,
} from '../-private/dsl';
import { AttrValue } from '../-private';

/**
 * Baseline
 */
{
  const div = emitElement('div');
  expectTypeOf(div).toEqualTypeOf<{ element: HTMLDivElement }>();
  expectTypeOf<typeof div.element>().toEqualTypeOf<HTMLDivElement>();

  applyAttributes(div.element, {
    'data-foo': 123,
    role: 'button',
  });
}

/**
 * Can we have typed custom-elements?
 * (yes)
 */
{
  expectTypeOf<GlintCustomElementMap>().toHaveProperty('AugmentedCustomElement');
  expectTypeOf<GlintCustomElementMap>().toHaveProperty('augmented-custom-element');
  expectTypeOf<GlintHtmlElementAttributesMap>().toHaveProperty('AugmentedCustomElement');

  const custom = emitElement('augmented-custom-element');

  type ElementName = CustomElementLookup<typeof custom.element>;
  expectTypeOf<ElementName>().not.toBeNever();
  expectTypeOf<ElementName>().toEqualTypeOf<'AugmentedCustomElement' | 'augmented-custom-element' | 'my-custom-element-element-for-tag-name'>();

  type FoundAttrs = AttributesForElement<typeof custom.element>;
  expectTypeOf<FoundAttrs>().not.toBeNever();
  expectTypeOf<FoundAttrs>().toHaveProperty('propNum');
  // The default type for attributes
  expectTypeOf<FoundAttrs['data-foo']>().not.toEqualTypeOf<AttrValue>();

  applyAttributes(custom.element, {
    propNum: 123,
    propStr: 'hello',
  });

  applyAttributes(custom.element, {
    // @ts-expect-error propNum expects a number, and I gave it a string to test that an error occurs
    propNum: 'wrong',
    // @ts-expect-error propStr expects a string, and I gave it a number to test that an error occurs
    propStr: 123,
  });
}
