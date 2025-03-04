const { createJiti } = require('jiti');
const jiti = createJiti(__filename);

const {
  createLanguageServicePlugin,
} = require('@volar/typescript/lib/quickstart/createLanguageServicePlugin.js');

const plugin = createLanguageServicePlugin((_ts: typeof import('typescript'), info: any) => {
  /**
   * we use the jiti (https://github.com/unjs/jiti) runtime to make it possible to
   * synchronously load the ESM glint libaries from the current CommonJS context. It is a requirement
   * that TypeScript plugins are written in CommonJS, which poses issues with
   * having Glint be authored in ESM due to the requirement that typically `await import`
   * is required to load ESM modules from CJS. But with jiti we can synchronously load the ESM
   * modules from CJS which lets us avoid a ton of hacks and complexity we (or Volar)
   * would otherwise have to write to bridge the sync/async APIs.
   */
  const glintCore = jiti('@glint/core');

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
});

export = plugin;
