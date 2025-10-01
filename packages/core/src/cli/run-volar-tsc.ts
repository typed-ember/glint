import { runTsc } from '@volar/typescript/lib/quickstart/runTsc.js';
import { createEmberLanguagePlugin } from '../volar/ember-language-plugin.js';
import { findConfig } from '../config/index.js';

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

export function run(): void {
  let cwd = process.cwd();

  const options = {
    extraSupportedExtensions: ['.gjs', '.gts'],

    // With the below configuration `{basename.gts}` will produce `{basename}.d.ts`
    // This is in line with how V2 addons build their components.
    // At build time, `.gts` components are emitted as `.js` files, so that's why the corresponding declarations should be `.d.ts`
    //
    // Please refer to https://github.com/typed-ember/glint/issues/988 for more information
    //
    // Before this option, glint emitted broken declarations in which relative imports to other .gts files did not strip extensions (https://github.com/typed-ember/glint/issues/628).
    // The declarations outputted by volar's runTsc luckily also remove extension in imports.
    extraExtensionsToRemove: ['.gjs', '.gts'],
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
