import { runTsc } from '@volar/typescript/lib/quickstart/runTsc.js';
import { createGtsLanguagePlugin } from '../volar/gts-language-plugin.js';
import { findConfig } from '../config/index.js';

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

export function run(): void {
  let runExtensions = ['.js', '.ts', '.gjs', '.gts', '.hbs'];
  let cwd = process.cwd();

  const options = {
    supportedExtensions: ['.js', '.ts', '.gjs', '.gts', '.hbs'],
    extensionsToRemove: [],

    // Uncomment this to produce `basename.d.ts` files instead of `basename.gts.d.ts`
    // extensionsToRemove: ['.gts', '.gjs'],
  }

  const main = (): void =>
    runTsc(require.resolve('typescript/lib/tsc'), options, (ts, options) => {
      const glintConfig = findConfig(cwd);

      // NOTE: this code used to assert in the failure of finding Glint config; I'm
      // not sure whether it's better to be lenient, but we were getting test failures
      // on environment-ember-loose's `yarn run test`.
      if (glintConfig) {
        const gtsLanguagePlugin = createGtsLanguagePlugin(glintConfig);
        return [gtsLanguagePlugin];
      } else {
        return [];
      }
    });
  main();
}
