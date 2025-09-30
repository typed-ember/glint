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
