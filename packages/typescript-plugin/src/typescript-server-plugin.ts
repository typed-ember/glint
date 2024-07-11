import { createLanguageServicePlugin } from '@volar/typescript/lib/quickstart/createLanguageServicePlugin.js';
import { findConfig } from '../../core/src/config/index.js';
import { createEmberLanguagePlugin } from '../../core/src/volar/ember-language-plugin.js';

const plugin = createLanguageServicePlugin((ts, info) => {
  const cwd = info.languageServiceHost.getCurrentDirectory();
  const glintConfig = findConfig(cwd);

  // NOTE: this code used to assert in the failure of finding Glint config; I'm
  // not sure whether it's better to be lenient, but we were getting test failures
  // on environment-ember-loose's `yarn run test`.
  if (glintConfig) {
    const gtsLanguagePlugin = createEmberLanguagePlugin(glintConfig);
    return {
      languagePlugins: [gtsLanguagePlugin],
    };
  } else {
    return {
      languagePlugins: [],
    };
  }
});

// @ts-expect-error TypeScript Plugin needs to be exported with `export =`
// eslint-disable-next-line no-restricted-syntax
export = plugin;
