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
  interface GlintCustomElementsMap {
    'my-custom-element': typeof MyCustomElement;
  }

  interface GlintTagNameAttributesMap {
    'my-custom-element': {
      'prop-num': number;
      'prop-str': string;
    };
  }
}
