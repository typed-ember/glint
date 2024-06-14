#!/usr/bin/env node

import {
  LanguageServicePlugin,
  LanguageServicePluginInstance,
  createConnection,
  createServer,
  createTypeScriptProject,
} from '@volar/language-server/node.js';
import { create as createTypeScriptServicePlugins } from 'volar-service-typescript';
import { createGtsLanguagePlugin } from './gts-language-plugin.js';
import { assert } from '../transform/util.js';
import { ConfigLoader } from '../config/loader.js';
import ts from 'typescript';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import type * as vscode from 'vscode-languageserver-protocol';

const connection = createConnection();

// this file basically boots and loads the server as a side effect of requiring this file.
// - [x] identify glint-main's effect-ful require():
//   - it is in language-server.ts;
//   - doesn't directly import language server
// - [ ] identify in glint main at what point the server is started / connected
const server = createServer(connection);

connection.onInitialize((parameters) => {
  const project = createTypeScriptProject(
    ts,
    undefined,
    // Return the language plugins required/used by our language server. Language Plugins
    (env, { configFileName }) => {
      const languagePlugins = [];

      // I don't remember why but there are some contexts where a configFileName is not known,
      // in which case we cannot fully activate all of the language plugins.
      if (configFileName) {
        // TODO: Maybe move ConfigLoader higher up so we can reuse it between calls to  `getLanguagePlugins`? That said,
        // Volar takes care of a lot of the same group-by-tsconfig caching that ConfigLoader does,
        // so it might not buy us much value any more.
        const configLoader = new ConfigLoader();
        const glintConfig = configLoader.configForFile(configFileName);
        assert(glintConfig, 'Glint config is missing');
        languagePlugins.unshift(createGtsLanguagePlugin(glintConfig));
      }

      return languagePlugins;
    }
  );
  return server.initialize(
    parameters,
    project,

    // Return the service plugins required/used by our language server. Service plugins provide
    // functionality for a single file/language type. For example, we use Volar's TypeScript service
    // for type-checking our .gts/.gjs files, but .gts/.gjs files are actually two separate languages
    // (TS + Handlebars) combined into one, but we can use the TS language service because the only
    // scripts we pass to the TS service for type-checking is transformed Intermediate Representation (IR)
    // TypeScript code with all <template> tags converted to type-checkable TS.
    createTypeScriptServicePlugins(ts).map<LanguageServicePlugin>((plugin) => {
      if (plugin.name === 'typescript-semantic') {
        // Extend the default TS service with Glint-specific customizations.
        // Similar approach as:
        // https://github.com/withastro/language-tools/blob/main/packages/language-server/src/plugins/typescript/index.ts#L14
        return {
          ...plugin,
          create(context): LanguageServicePluginInstance {
            const typeScriptPlugin = plugin.create(context);

            return {
              ...typeScriptPlugin,
              async provideDiagnostics(document: TextDocument, token: vscode.CancellationToken) {
                const diagnostics = await typeScriptPlugin.provideDiagnostics!(document, token);
                if (!diagnostics) {
                  return null;
                }
                return diagnostics.map((diagnostic) => {
                  return {
                    ...diagnostic,
                    source: 'glint',
                  };
                });
              },
              async provideSemanticDiagnostics(
                document: TextDocument,
                token: vscode.CancellationToken
              ) {
                const diagnostics = await typeScriptPlugin.provideSemanticDiagnostics!(
                  document,
                  token
                );
                if (!diagnostics) {
                  return null;
                }
                return diagnostics.map((diagnostic) => {
                  return {
                    ...diagnostic,
                    source: 'glint',
                  };
                });
              },
            };
          },
        };
      } else {
        return plugin;
      }
    })
  );
});

// connection.onRequest('mdx/toggleDelete', async (parameters) => {
//   const commands = await getCommands(parameters.uri)
//   return commands.toggleDelete(parameters)
// })

// connection.onRequest('mdx/toggleEmphasis', async (parameters) => {
//   const commands = await getCommands(parameters.uri)
//   return commands.toggleEmphasis(parameters)
// })

// connection.onRequest('mdx/toggleInlineCode', async (parameters) => {
//   const commands = await getCommands(parameters.uri)
//   return commands.toggleInlineCode(parameters)
// })

// connection.onRequest('mdx/toggleStrong', async (parameters) => {
//   const commands = await getCommands(parameters.uri)
//   return commands.toggleStrong(parameters)
// })

/**
 * Invoked when client has sent `initialized` notification. Volar takes this
 * opportunity to finish initializing, and we tell the client which extensions
 * it should add file-watchers for (technically file-watchers could eagerly
 * be set up on the client (e.g. when the extension activates), but since Volar
 * capabilities use dynamic/deferredregistration, we have the server tell the
 * client which files to watch via the deferred `registerCapability` message
 * within `watchFiles()`).
 */
connection.onInitialized(() => {
  server.initialized();

  const extensions = [
    // 'js',
    // 'ts',
    'gjs',
    'gts',
    'hbs',
  ];

  server.watchFiles([`**.*.{${extensions.join(',')}}`]);
});

connection.listen();

/**
 * @param {string} uri
 * @returns {Promise<Commands>}
 */
// async function getCommands(uri) {
//   const project = await server.projects.getProject(uri)
//   const service = project.getLanguageService()
//   return service.context.inject('mdxCommands')
// }
