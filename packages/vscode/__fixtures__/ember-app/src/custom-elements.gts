
import '@glint/template';
declare global {
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
  <my-custom-element prop-num={{two}} prop-str={{str}}></my-custom-element>

  {{!@glint-expect-error: swapped props}}
  <my-custom-element prop-num={{str}} prop-str={{two}}></my-custom-element>
</template>;