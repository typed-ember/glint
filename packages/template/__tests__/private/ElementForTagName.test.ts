import { expectTypeOf } from 'expect-type';
import type { ElementForTagName } from '../../-private/dsl';
import { RegisteredElement } from '../custom-elements-registry';

// Built-in elements come from `HTMLElementTagNameMap`
{
  expectTypeOf<ElementForTagName<'div'>>().toEqualTypeOf<HTMLDivElement>();
  expectTypeOf<ElementForTagName<'img'>>().toEqualTypeOf<HTMLImageElement>();
}

// Registered custom elements come from `GlintCustomElementTagNameMap`
{
  type X = ElementForTagName<'registered-element'>;

  expectTypeOf<X>().toEqualTypeOf<RegisteredElement>();
  expectTypeOf<X['registeredElementProp']>().toEqualTypeOf<number>();
}

// Unknown tag names fall back to `Element`
{
  expectTypeOf<ElementForTagName<'not-registered'>>().toEqualTypeOf<Element>();
}
