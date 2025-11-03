
import '@glint/template';

class MyCustomElement extends HTMLElement {
    propNum!: number;
    propStr!: string;
}

declare global {
    interface GlintCustomElements {
        'my-custom-element': MyCustomElement;
    }
    interface GlintHtmlElementAttributesMap {
        'my-custom-element': {
            propNum: number;
            propStr: string;
        };
    }
}

const two = 2;
const str = "hello";

export const UsesCustomElement = <template>
  {{! Baseline to test that the TS Plugin is working}}
  <a href="https://example.com">Example</a>

  {{! @glint-expect-error: wrong type}}
  <a href={{(Array)}}>Example</a>

  {{! Correct usage of custom element}}
  <my-custom-element prop-num={{two}} prop-str={{str}}></my-custom-element>

  {{! @glint-expect-error: swapped props}}
  <my-custom-element prop-num={{str}} prop-str={{two}}></my-custom-element>
</template>;