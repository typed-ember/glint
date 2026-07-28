import '@glint/template';

const two = 2;
const str = 'hello';

export class MyCustomElement extends HTMLElement {
  propNum!: number;
  propStr!: string;
}

declare global {
  interface GlintCustomElementTagNameMap {
    'my-custom-element': MyCustomElement;
  }

  interface GlintCustomElementAttributesMap {
    'my-custom-element': {
      'prop-num': number;
      'prop-str': string;
    };
  }
}

// The registered element type is exposed via the same lookup templates use
export type X = GlintCustomElementTagNameMap['my-custom-element'];

export const UsesCustomElement = <template>
  <my-custom-element prop-num={{two}} prop-str={{str}}></my-custom-element>

  <my-custom-element
    {{! @glint-expect-error: swapped props }}
    prop-num={{str}}
    {{! @glint-expect-error: swapped props }}
    prop-str={{two}}
  ></my-custom-element>

  <my-custom-element
    {{! @glint-expect-error: unknown attribute }}
    prop-nope="x"
  ></my-custom-element>

  {{! unregistered custom elements still accept arbitrary attributes }}
  <some-other-element anything="goes"></some-other-element>
</template>;

export const MultipleUnknownAttributes = <template>
  {{! every unknown attribute is reported, not just the first }}
  <my-custom-element
    {{! @glint-expect-error: unknown attribute }}
    foo="hi"
    {{! @glint-expect-error: unknown attribute }}
    bar="hi"
  ></my-custom-element>
</template>;
