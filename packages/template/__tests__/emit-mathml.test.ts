import { expectTypeOf } from 'expect-type';
import { emitMathMlElement } from '../-private/dsl';

{
  let math = emitMathMlElement('math');

  expectTypeOf(math).not.toBeAny();
  expectTypeOf(math).not.toBeUnknown();
  expectTypeOf(math.element).not.toEqualTypeOf<Element>();
  expectTypeOf(math.element).toEqualTypeOf<MathMLElement>();
}

{
  let mi = emitMathMlElement('mi');

  expectTypeOf(mi).not.toBeAny();
  expectTypeOf(mi).not.toBeUnknown();
  expectTypeOf(mi.element).not.toEqualTypeOf<Element>();
  expectTypeOf(mi.element).toEqualTypeOf<MathMLElement>();
}
