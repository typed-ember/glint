import '@glint/template';

import { expectTypeOf } from 'expect-type';
import { emitElement, applyAttributes, AttributesForElement, Lookup } from '../-private/dsl';

class MyCustomElement extends HTMLElement {
  propNum!: number;
  propStr!: string;
}


declare global {
  interface GlintCustomElements {
    'my-custom-element-emit-element': MyCustomElement;
  }

 interface GlintElementRegistry {
    'MyCustomElement': MyCustomElement;
  }

  interface GlintHtmlElementAttributesMap {
    'MyCustomElement': {
        propNum: number;
        propStr: string;
    };
  }
}

/**
 * Baseline
 */
{
  const div = emitElement('div');
  expectTypeOf(div).toEqualTypeOf<{ element: HTMLDivElement }>();
  expectTypeOf<typeof div.element>().toEqualTypeOf<HTMLDivElement>();

  applyAttributes(div.element, {
  'data-foo': 123,
  'role': 'button',
});

}

/**
 * Can we have typed custom-elements?
 * (yes)
 */
{

  expectTypeOf<GlintElementRegistry>().toHaveProperty('MyCustomElement');
  expectTypeOf<GlintCustomElements>().toHaveProperty('my-custom-element-emit-element');
  expectTypeOf<GlintHtmlElementAttributesMap>().toHaveProperty('MyCustomElement');
  
  
  const custom = emitElement('my-custom-element-emit-element');
  expectTypeOf(custom).toEqualTypeOf<{ element: MyCustomElement }>();
  expectTypeOf<typeof custom.element>().toEqualTypeOf<MyCustomElement>();
  
  type ElementName = Lookup<typeof custom.element>
  expectTypeOf<ElementName>().toEqualTypeOf<'MyCustomElement'>();
  
  type FoundAttrs = AttributesForElement<typeof custom.element>;
  expectTypeOf<FoundAttrs>().not.toBeNever();
  expectTypeOf<FoundAttrs>().toHaveProperty('propNum');
  
  applyAttributes(custom.element, {
    propNum: 123,
    propStr: 'hello',
  }); 
}
  