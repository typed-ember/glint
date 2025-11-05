import '@glint/ember-tsc/types';

import { HelperLike } from '@glint/template';

declare module '@glint/ember-tsc/globals' {
  export default interface Globals {
    t: HelperLike<{
      Args: {
        Positional: string[];
        Named: Record<string, unknown>;
      };
      Return: string;
    }>;
  }
}

class MyCustomElement extends HTMLElement {
  propNum!: number;
  propStr!: string;
}

declare global {
  interface GlintCustomElements {
    'my-custom-element': MyCustomElement;
  }

  interface GlintElementRegistry {
    MyCustomElement: MyCustomElement;
  }

  interface GlintHtmlElementAttributesMap {
    'my-custom-element': {
      propNum: number;
      propStr: string;
    };
  }
}
