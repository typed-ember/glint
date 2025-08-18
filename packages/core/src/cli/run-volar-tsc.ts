import { runTsc } from '@volar/typescript/lib/quickstart/runTsc.js';
import { createEmberLanguagePlugin } from '../volar/ember-language-plugin.js';
import { findConfig } from '../config/index.js';

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

export function run(): void {
  let cwd = process.cwd();

  const options = {
    extraSupportedExtensions: ['.gjs', '.gts'],

    extraExtensionsToRemove: [],

    // With the above configuration, `{basename}.gts` will produce `{basename}.gts.d.ts`.
    // If we would prefer `{basename}.d.ts`, we could use the following configuration instead:
    //
    // extraExtensionsToRemove: ['.gts', '.gjs'],
    //
    // See discussion here: https://github.com/typed-ember/glint/issues/628
  };

  const main = (): void =>
    runTsc(require.resolve('typescript/lib/tsc'), options, (ts, options) => {
      const glintConfig = findConfig(cwd);

      if (glintConfig) {
        const gtsLanguagePlugin = createEmberLanguagePlugin(glintConfig);
        return [gtsLanguagePlugin];
      } else {
        return [];
      }
    });
  main();
}
