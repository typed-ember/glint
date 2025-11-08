import { expectTypeOf } from 'expect-type';
import {
  emitElement,
  applyAttributes,
  WithDataAttributes,
  AttributesForTagName,
} from '../-private/dsl';
import { AugmentedCustomElement, AugmentedCustomElementAttributes } from './augmentation.test';

/**
 * Baseline
 */
{
  const div = emitElement('div');

  type Attrs = AttributesForTagName<`div`>;
  expectTypeOf<Attrs>().toEqualTypeOf<WithDataAttributes<HTMLDivElementAttributes>>();
  expectTypeOf(div.element).toEqualTypeOf<HTMLDivElement>();
  expectTypeOf(div.attributes).toEqualTypeOf<WithDataAttributes<HTMLDivElementAttributes>>();

  applyAttributes(div, {
    'data-foo': '123',
    role: 'button',
  });
}

/**
 * Can we have typed custom-elements?
 * (yes)
 */
{
  expectTypeOf<GlintCustomElementMap>().toHaveProperty('augmented-custom-element');

  const custom = emitElement('augmented-custom-element');

  type Attrs = AttributesForTagName<`augmented-custom-element`>;
  expectTypeOf<keyof Attrs>().toEqualTypeOf<'propNum' | 'propStr' | `data-${string}`>();
  expectTypeOf(custom.element).toEqualTypeOf<typeof AugmentedCustomElement>();
  expectTypeOf(custom.attributes).toEqualTypeOf<
    WithDataAttributes<AugmentedCustomElementAttributes>
  >();

  applyAttributes(custom, {
    propNum: 123,
    propStr: 'hello',
    // @ts-expect-error propNope does not exist
    propNope: 'wrong',
  });

  applyAttributes(custom, {
    // @ts-expect-error propNum expects a number, and I gave it a string to test that an error occurs
    propNum: 'wrong',
    // @ts-expect-error propStr expects a string, and I gave it a number to test that an error occurs
    propStr: 123,
  });
}
