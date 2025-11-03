import '@glint/template';

import { expectTypeOf } from 'expect-type';
import { emitElement } from '../-private/dsl';

class MyCustomElement extends HTMLElement {
  propNum!: number;
  propStr!: string;
}

declare global {
  interface GlintCustomElements {
    'my-custom-element-emit-element': MyCustomElement;
  }
}

const div = emitElement('div');
expectTypeOf(div).toEqualTypeOf<{ element: HTMLDivElement }>();

const custom = emitElement('my-custom-element-emit-element');

expectTypeOf(custom).toEqualTypeOf<{ element: MyCustomElement }>();
