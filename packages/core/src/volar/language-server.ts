#!/usr/bin/env node

import {
  createConnection,
  createServer,
  createTypeScriptProject,
} from '@volar/language-server/node.js';
import { createEmberLanguagePlugin } from './ember-language-plugin.js';
import { ConfigLoader } from '../config/loader.js';
import ts from 'typescript';
import { Disposable, LanguagePlugin, URI, VirtualCode } from '@volar/language-service';
import { createTypescriptLanguageServicePlugin } from './typescript-language-service-plugin.js';

const connection = createConnection();
const server = createServer(connection);

const EXTENSIONS = ['js', 'ts', 'gjs', 'gts', 'hbs'];

/**
 * Handle the `initialize` request from the client. This is the first request sent by the client to
 * the server. It includes the set of capabilities supported by the client as well as
 * other initialization params needed by the server.
 */
connection.onInitialize((parameters) => {
  // Not sure how tsLocalized is used.
  const tsLocalized = undefined;
  const watchingExtensions = new Set<string>();
  let fileWatcher: Promise<Disposable> | undefined;

  const project = createTypeScriptProject(ts, tsLocalized, (projectContext) => {
    const configFileName = projectContext.configFileName;
    const languagePlugins = [];

    updateFileWatcher();

    // I don't remember why but there are some contexts where a configFileName is not known,
    // in which case we cannot fully activate all of the language plugins.
    if (configFileName) {
      // TODO: Maybe move ConfigLoader higher up so we can reuse it between calls to  `getLanguagePlugins`? That said,
      // Volar takes care of a lot of the same group-by-tsconfig caching that ConfigLoader does,
      // so it might not buy us much value any more.
      const configLoader = new ConfigLoader();
      const glintConfig = configLoader.configForFile(configFileName);

      // TODO: this causes breakage if/when Glint activates for a non-Glint project.
      // But if we don't assert, then we activate TS and Glint for non TS projects,
      // which doubles diagnostics... how to disable the LS entirely if no Glint?
      // assert(glintConfig, 'Glint config is missing');

      if (glintConfig) {
        // TODO: this is where we used to initialize the Language Server
        // with our Ember Language Plugin so that we can teach the LS how to perform
        // TS diagnostics, but this functionality has been moved to TS Plugin.
        // There will still be commands and other tooling that is useful to have
        // in the Language Server so we should identify what those are and reinstate,
        // while continu

        const disableLanguagePlugin = true;
        if (!disableLanguagePlugin) {
          // When TS Plugin is enabled, we want the TS Plugin to perform all type-checking/diagnostics/etc,
          // rather than the Language Server.
          languagePlugins.unshift(createEmberLanguagePlugin(glintConfig));
        }
      }
    }

    return {
      languagePlugins,
      setup(_language) {
        // Vue tooling takes this opportunity to stash compilerOptions on `language.vue`;
        // do we need to be doing something here?
      },
    };
  });

  const languageServicePlugins = createTypescriptLanguageServicePlugin(ts);

  return server.initialize(parameters, project, languageServicePlugins);

  function updateFileWatcher(): void {
    const newExtensions = EXTENSIONS.filter((ext) => !watchingExtensions.has(ext));
    if (newExtensions.length) {
      for (const ext of newExtensions) {
        watchingExtensions.add(ext);
      }
      fileWatcher?.then((dispose) => dispose.dispose());
      fileWatcher = server.fileWatcher.watchFiles([
        '**/*.{' + [...watchingExtensions].join(',') + '}',
      ]);
    }
  }
});

/**
 * Invoked when client has sent `initialized` notification.
 */
connection.onInitialized(() => {
  server.initialized();
});

connection.listen();
