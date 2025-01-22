import type ts from 'typescript';

// Top level "imports" need to be CJS `require`s because TS Plugins must be CJS;
// we dynamically import() the ESM modules we need below within the async fn
// to cross the gap between CJS and ESM.
const {
  createAsyncLanguageServicePlugin,
} = require('@volar/typescript/lib/quickstart/createAsyncLanguageServicePlugin.js');

/**
 * Volar provides two variants of functions for initializing a TS Plugin:
 * - createLanguageServicePlugin
 * - createAsyncLanguageServicePlugin
 *
 * The only difference is whether their setup callback is an async function or not.
 * The reason we use the async variant is because of our use of `await import`, which
 * we need in order to import the ESM glint package into our CJS VSCode extension.
 *
 * Unfortunately this singular tick of async appears to be causing a few race conditions,
 * in particular that when freshly booting VSCode on a .gts file, there might not be
 * any diagnostic messages until something "kicks" the TS Plugin to run, e.g.
 * by editing the file.
 */
const plugin = createAsyncLanguageServicePlugin(
  ['.gts', '.gjs', '.hbs'],
  (fileName: string) => {
    if (fileName.endsWith('.gts')) {
      return 3 satisfies ts.ScriptKind.TS;
    } else if (fileName.endsWith('.gjs')) {
      return 1 satisfies ts.ScriptKind.JS;
    }
    return 3 satisfies ts.ScriptKind.TS;
  },
  async (_ts: any, info: any) => {
    // The diagnostics race condition mentioned above appears to happen or at least
    // be exacerbated by the fact that we use `await import` here.
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
