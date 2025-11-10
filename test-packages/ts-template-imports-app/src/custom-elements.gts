const two = 2;
const str = "hello";

type X = GlintCustomElementsMap['my-custom-element'];

export const UsesCustomElement = <template>
  {{! defined in types/index.d.ts via Globals}}
  {{t "hello"}}
  {{! @glint-expect-error}}
  {{t 223}}

  <my-custom-element prop-num={{two}} prop-str={{str}}></my-custom-element>

  
  <my-custom-element 
    {{!@glint-expect-error: swapped props}}
    prop-num={{str}} 
    {{!@glint-expect-error: swapped props}}
    prop-str={{two}}
  ></my-custom-element>
</template>;
