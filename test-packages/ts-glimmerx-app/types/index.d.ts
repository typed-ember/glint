import '@glint/environment-glimmerx';
import type { Helper } from '@glimmerx/helper';
declare module '@glint/environment-glimmerx/globals' {
  export default interface Globals {
    t: Helper<{
      Args: {
        Positional: string[];
        Named: Record<string, unknown>;
      };
      Return: string;
    }>;
  }
}
