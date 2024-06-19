#!/usr/bin/env node

import {
  LanguageServiceContext,
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
import { URI } from 'vscode-uri';
import { VirtualGtsCode } from './gts-virtual-code.js';
import { augmentDiagnostic } from '../transform/diagnostics/augmentation.js';
import MappingTree from '../transform/template/mapping-tree.js';
import { TransformedModule } from '../transform/index.js';

const connection = createConnection();

const server = createServer(connection);

/**
 * Handle the `initialize` request from the client. This is the first request sent by the client to
 * the server. It includes the set of capabilities supported by the client as well as
 * other initialization params needed by the server.
 */
connection.onInitialize((parameters) => {
  const project = createTypeScriptProject(ts, undefined, (env, { configFileName }) => {
    const languagePlugins = [];

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
        languagePlugins.unshift(createGtsLanguagePlugin(glintConfig));
      }
    }

    return languagePlugins;
  });
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
                return filterAndAugmentDiagnostics(context, document, diagnostics);
              },
              async provideSemanticDiagnostics(
                document: TextDocument,
                token: vscode.CancellationToken
              ) {
                const diagnostics = await typeScriptPlugin.provideSemanticDiagnostics!(
                  document,
                  token
                );
                return filterAndAugmentDiagnostics(context, document, diagnostics);
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

function filterAndAugmentDiagnostics(
  context: LanguageServiceContext,
  document: TextDocument,
  diagnostics: vscode.Diagnostic[] | null | undefined
) {
  if (!diagnostics) {
    // This can fail if .gts file fails to parse. Maybe other use cases too?
    return null;
  }

  if (diagnostics.length == 0) {
    return diagnostics;
  }

  let cachedTransformedModule: TransformedModule | null | undefined = undefined;

  const mappingForDiagnostic = (diagnostic: vscode.Diagnostic): MappingTree | null => {
    if (typeof cachedTransformedModule === 'undefined') {
      cachedTransformedModule = null;

      const decoded = context.decodeEmbeddedDocumentUri(URI.parse(document.uri));
      if (decoded) {
        const script = context.language.scripts.get(decoded[0]);
        const scriptRoot = script?.generated?.root;
        if (scriptRoot instanceof VirtualGtsCode) {
          const transformedModule = scriptRoot.transformedModule;
          if (transformedModule) {
            cachedTransformedModule = transformedModule;
          }
        }
      }
    }

    if (!cachedTransformedModule) {
      return null;
    }

    const range = diagnostic.range;
    const start = document.offsetAt(range.start);
    const end = document.offsetAt(range.end);
    const rangeWithMappingAndSource = cachedTransformedModule.getOriginalRange(start, end);
    return rangeWithMappingAndSource.mapping || null;
  };

  return diagnostics.map((diagnostic) => {
    diagnostic = {
      ...diagnostic,
      source: 'glint',
    };

    diagnostic = augmentDiagnostic(diagnostic as any, mappingForDiagnostic);

    return diagnostic;
  });
}

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

  const extensions = ['js', 'ts', 'gjs', 'gts', 'hbs'];

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
