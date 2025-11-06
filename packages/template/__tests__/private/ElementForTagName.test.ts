import '@glint/template';

import { expectTypeOf } from 'expect-type';
import type { ElementForTagName } from '../../-private/dsl/types';

class MyCustomElement extends HTMLElement {
  propNum!: number;
  propStr!: string;
}

declare global {
  interface GlintCustomElementRegistry {
    'my-custom-element-element-for-tag-name': MyCustomElement;
  }
}

{
  type X = ElementForTagName<'my-custom-element-element-for-tag-name'>;

  expectTypeOf<X>().toEqualTypeOf<MyCustomElement>();
  expectTypeOf<X['propNum']>().toEqualTypeOf<number>();
  expectTypeOf<X['propStr']>().toEqualTypeOf<string>();

  expectTypeOf<X['propNum']>().not.toEqualTypeOf<string>();
}
