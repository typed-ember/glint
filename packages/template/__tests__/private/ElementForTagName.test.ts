import '@glint/template';

import { expectTypeOf } from 'expect-type';
import type { ElementForTagName } from '../../-private/dsl/types';

class MyCustomElement extends HTMLElement {
  declare propNum: number;
  declare propStr: string;
  declare propBool: boolean;

  declare static readonly __brand: unique symbol;
}

declare global {
  interface GlintCustomElementMap {
    'my-custom-element-element-for-tag-name': MyCustomElement;
  }
}

{
  type X = ElementForTagName<'my-custom-element-element-for-tag-name'>;

  expectTypeOf<X>().toEqualTypeOf<MyCustomElement>();
  expectTypeOf<X['propNum']>().toEqualTypeOf<number>();
  expectTypeOf<X['propStr']>().toEqualTypeOf<string>();
  expectTypeOf<X['propBool']>().toEqualTypeOf<boolean>();

  expectTypeOf<X['propNum']>().not.toEqualTypeOf<string>();
}
