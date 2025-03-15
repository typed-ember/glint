import { on } from "@ember/modifier";
import type { TOC } from "@ember/component/template-only";

export interface ItemSignature {
  Element: HTMLButtonElement;
  Args: { onSelect?: (event: Event) => void };
  Blocks: { default: [] };
}

// https://github.com/typed-ember/glint/issues/812
export const Item: TOC<ItemSignature> = <template>
  <button
    type="button"
    role="menuitem"
    {{(if @onSelect (modifier on "click" @onSelect))}}
    ...attributes
  >
    {{yield}}
  </button>
</template>;
