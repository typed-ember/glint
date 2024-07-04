import { runTsc } from '@volar/typescript/lib/quickstart/runTsc.js';
import { createGtsLanguagePlugin } from '../volar/gts-language-plugin.js';
import { findConfig } from '../config/index.js';

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

export function run(): void {
  let cwd = process.cwd();

  const options = {
    supportedExtensions: ['.js', '.ts', '.gjs', '.gts', '.hbs'],

    extensionsToRemove: [],

    // Alternatively, we can consider changing this to:
    //
    // extensionsToRemove: ['.gts', '.gjs'],
    //
    // If we uncomment this, two things happen:
    //
    // 1. Instead of `{basename}.gts` producing `{basename}.gts.d.ts` (Volar's default), it'll
    //    produce `{basename}.d.ts`, which is what classic Glint used to produce but might not
    //    be the ideal default for V2 Glint. See discussion here:
    //    https://github.com/typed-ember/glint/issues/628
    // 2. Running `glint --build --clean` will correctly remove any `{basename}.d.ts` (and similar
    //    output files), but when commented out it, due to a "bug" in `tsc`, it'll leave behind
    //    the `{basenmae}.gts.d.ts` files. This doesn't seem fixable in Volar but would need
    //    a fix in `tsc`.
    //
    // So both approaches have their issues, but for now we are sticking with `{basename}.gts.d.ts`
    // and a broken `--clean` command.
    //
  };

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
