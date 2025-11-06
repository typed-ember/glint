import { expectTypeOf } from 'expect-type';
import {
  emitElement,
  applyAttributes,
  CustomElementLookup,
  WithDataAttributes,
  AttributesForTagName,
} from '../-private/dsl';
import { AttrValue } from '../-private';
import { AugmentedCustomElement } from './augmentation.test';

/**
 * Baseline
 */
{
  const div = emitElement('div');
  expectTypeOf<AttributesForTagName<`div`>>().toEqualTypeOf<HTMLDivElementAttributes>();
  expectTypeOf(div.element).toEqualTypeOf<HTMLDivElement>();
  expectTypeOf(div.attributes).toEqualTypeOf<WithDataAttributes<HTMLDivElementAttributes>>();

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
  // expectTypeOf<GlintCustomElementMap>().toHaveProperty('AugmentedCustomElement');
  expectTypeOf<GlintCustomElementMap>().toHaveProperty('augmented-custom-element');

  const custom = emitElement('augmented-custom-element');

  type L = CustomElementLookup<typeof custom.element>;
  expectTypeOf<L>().toEqualTypeOf<'augmented-custom-element'>();

  expectTypeOf<AttributesForTagName<`augmented-custom-element`>>().toEqualTypeOf<typeof AugmentedCustomElement>();
  expectTypeOf(custom.element).toEqualTypeOf<typeof AugmentedCustomElement>();
  expectTypeOf(custom.attributes).toEqualTypeOf<WithDataAttributes<HTMLElementAttributes>>();
  type X = keyof typeof custom.attributes;
  expectTypeOf<X>().toEqualTypeOf<`propNum` | `propStr`>();

  applyAttributes(custom, {
    propNum: 123,
    propStr: 'hello',
  });

  applyAttributes(custom, {
    // @ts-expect-error propNum expects a number, and I gave it a string to test that an error occurs
    propNum: 'wrong',
    // @ts-expect-error propStr expects a string, and I gave it a number to test that an error occurs
    propStr: 123,
  });
}
