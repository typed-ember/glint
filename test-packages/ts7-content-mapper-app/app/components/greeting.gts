import type { TOC } from "@ember/component/template-only";

import { shout } from "#utils/format.ts";

export interface GreetingSignature {
  Args: {
    name: string;
  };
  Blocks: {
    default?: [];
  };
  Element: HTMLParagraphElement;
}

export const Greeting: TOC<GreetingSignature> = <template>
  <p ...attributes>
    {{shout @name}}
    {{yield}}
  </p>
</template>;

export default Greeting;
