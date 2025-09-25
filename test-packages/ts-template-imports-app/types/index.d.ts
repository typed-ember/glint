import '@glint/core/types';

import { HelperLike } from '@glint/template';

declare module '@glint/core/globals' {
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
