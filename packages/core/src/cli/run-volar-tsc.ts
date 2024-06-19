import { runTsc } from '@volar/typescript/lib/quickstart/runTsc.js';
import { createGtsLanguagePlugin } from '../volar/gts-language-plugin.js';
import { loadConfig } from '../config/index.js';

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

export function run() {
  let runExtensions = ['.js', '.ts', '.gjs', '.gts', '.hbs'];
  let cwd = process.cwd();

  const main = () =>
    runTsc(require.resolve('typescript/lib/tsc'), runExtensions, (ts, options) => {
      const glintConfig = loadConfig(cwd);
      const gtsLanguagePlugin = createGtsLanguagePlugin(glintConfig);
      return [gtsLanguagePlugin];
    });
  main();
}
