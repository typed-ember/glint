#!/usr/bin/env node

import {
  createConnection,
  createServer,
  createTypeScriptProjectProvider,
} from '@volar/language-server/node.js';
import { create as createTypeScriptServicePlugin } from 'volar-service-typescript';
import { createGtsLanguagePlugin } from './gts-language-plugin.js';
import { assert } from '../transform/util.js';
import { ConfigLoader } from '../config/loader.js';

const connection = createConnection();
const server = createServer(connection);

connection.onInitialize((parameters) =>
  server.initialize(parameters, createTypeScriptProjectProvider, {
    watchFileExtensions: [
      // 'js',
      // 'ts',
      'gjs',
      'gts',
      'hbs',
      // 'ts',
    ],

    // Return the service plugins required/used by our language server. Service plugins provide
    // functionality for a single file/language type. For example, we use Volar's TypeScript service
    // for type-checking our .gts/.gjs files, but .gts/.gjs files are actually two separate languages
    // (TS + Handlebars) combined into one, but we can use the TS language service because the only
    // scripts we pass to the TS service for type-checking is transformed Intermediate Representation (IR)
    // TypeScript code with all <template> tags converted to type-checkable TS.
    getServicePlugins() {
      assert(server.modules.typescript, 'TypeScript module is missing');

      return [
        createTypeScriptServicePlugin(server.modules.typescript),
      ];
    },

    // Return the language plugins required/used by our language server. Language Plugins 
    async getLanguagePlugins(_serviceEnvironment, projectContext) {
      const ts = server.modules.typescript;
      assert(ts, 'TypeScript module is missing');

      const configFileName = projectContext?.typescript?.configFileName;

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
    },
  })
);

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

connection.onInitialized(() => {
  server.initialized();
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
