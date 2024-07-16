import type ts from 'typescript';

// Top level "imports" need to be CJS `require`s because TS Plugins must be CJS;
// we dynamically import() the ESM modules we need below within the async fn
// to cross the gap between CJS and ESM.
const {
  createAsyncLanguageServicePlugin,
} = require('@volar/typescript/lib/quickstart/createAsyncLanguageServicePlugin.js');

const plugin = createAsyncLanguageServicePlugin(
  ['.gts', '.gjs', '.hbs'],
  (fileName: string) => {
    if (fileName.endsWith('.hbs')) {
      return 3 satisfies ts.ScriptKind.TS;
    } else if (fileName.endsWith('.gts')) {
      return 3 satisfies ts.ScriptKind.TS;
    } else if (fileName.endsWith('.gjs')) {
      return 1 satisfies ts.ScriptKind.JS;
    }
    return 3 satisfies ts.ScriptKind.TS;
  },
  async (_ts: any, info: any) => {
    const glintCore = await import('@glint/core');
    const { findConfig, createEmberLanguagePlugin } = glintCore;

    const cwd = info.languageServiceHost.getCurrentDirectory();
    const glintConfig = findConfig(cwd);

    if (glintConfig && glintConfig.enableTsPlugin) {
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
