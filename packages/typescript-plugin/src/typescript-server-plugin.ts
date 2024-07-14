import type ts from 'typescript';

// Top level "imports" need to be CJS `require`s because TS Plugins must be CJS;
// we dynamically import() the ESM modules we need below within the async fn
// to cross the gap between CJS and ESM.
const {
  createAsyncLanguageServicePlugin,
} = require('@volar/typescript/lib/quickstart/createAsyncLanguageServicePlugin.js');

const plugin = createAsyncLanguageServicePlugin(
  ['.ts', '.js', '.gts', '.gjs', '.hbs'],
  7 satisfies ts.ScriptKind.Deferred,
  async (_ts: any, info: any) => {
    const { findConfig, createEmberLanguagePlugin } = await import('@glint/core');

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
  },
);

export = plugin;
