const two = 2;
const str = "hello";

export type X = GlintCustomElementRegistry['my-custom-element'];

export const UsesCustomElement = <template>
  <my-custom-element prop-num={{two}} prop-str={{str}}></my-custom-element>
  
  <my-custom-element 
    {{!@glint-expect-error: swapped props}}
    prop-num={{str}} 
    {{!@glint-expect-error: swapped props}}
    prop-str={{two}}
  ></my-custom-element>
</template>;
