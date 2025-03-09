import type { LanguageServer } from '@volar/language-server';
import { createLanguageServiceEnvironment } from '@volar/language-server/lib/project/simpleProject.js';
import { createConnection, createServer, loadTsdkByPath } from '@volar/language-server/node.js';
import { createLanguage } from '@volar/language-core';
import { createLanguageService, createUriMap, LanguageService } from '@volar/language-service';
import type * as ts from 'typescript';
import { URI } from 'vscode-uri';
import { createEmberLanguagePlugin } from './ember-language-plugin.js';
import { ConfigLoader } from '../config/loader.js';
import type { LanguageServiceContext, LanguageServicePlugin } from '@volar/language-service';

type GlintInitializationOptions = any; // TODO rm hackiness

const connection = createConnection();
const server = createServer(connection);

connection.listen();

/**
 * Handle the `initialize` request from the client. This is the first request sent by the client to
 * the server. It includes the set of capabilities supported by the client as well as
 * other initialization params needed by the server.
 */
connection.onInitialize((params) => {
  const options: GlintInitializationOptions = params.initializationOptions;

  if (!options.typescript?.tsdk) {
    throw new Error('typescript.tsdk is required');
  }

  // TODO: Perform Vue-style proxying to tsserver instance
  // See: https://github.com/vuejs/language-tools/pull/5252
  // if (!options.typescript?.requestForwardingCommand) {
  //   connection.console.warn(
  //     'typescript.requestForwardingCommand is required since >= 3.0 for complete TS features',
  //   );
  // }

  const { typescript: ts } = loadTsdkByPath(options.typescript.tsdk, params.locale);
  const tsconfigProjects = createUriMap<LanguageService>();

  server.fileWatcher.onDidChangeWatchedFiles((obj: any) => {
    for (const change of obj.changes) {
      const changeUri = URI.parse(change.uri);
      if (tsconfigProjects.has(changeUri)) {
        tsconfigProjects.get(changeUri)!.dispose();
        tsconfigProjects.delete(changeUri);
      }
    }
  });

  let simpleLs: LanguageService | undefined;

  return server.initialize(
    params,
    {
      setup() {},
      async getLanguageService(uri) {
        if (uri.scheme === 'file' && options.typescript.requestForwardingCommand) {
          const fileName = uri.fsPath.replace(/\\/g, '/');
          const projectInfo = await sendTsRequest<ts.server.protocol.ProjectInfo>(
            ts.server.protocol.CommandTypes.ProjectInfo,
            {
              file: fileName,
              needFileNameList: false,
            } satisfies ts.server.protocol.ProjectInfoRequestArgs,
          );
          if (projectInfo) {
            const { configFileName } = projectInfo;
            let ls = tsconfigProjects.get(URI.file(configFileName));
            if (!ls) {
              ls = createLs(server, configFileName);
              tsconfigProjects.set(URI.file(configFileName), ls);
            }
            return ls;
          }
        }
        return (simpleLs ??= createLs(server, undefined));
      },
      getExistingLanguageServices() {
        return Promise.all([...tsconfigProjects.values(), simpleLs].filter((promise) => !!promise));
      },
      reload() {
        for (const ls of [...tsconfigProjects.values(), simpleLs]) {
          ls?.dispose();
        }
        tsconfigProjects.clear();
        simpleLs = undefined;
      },
    },
    getHybridModeLanguageServicePluginsForLanguageServer(
      ts,
      options.typescript.requestForwardingCommand
        ? {
            // TODO: Perform Vue-style proxying to tsserver instance
            // See: https://github.com/vuejs/language-tools/pull/5252
            //
            // collectExtractProps(...args) {
            //   return sendTsRequest('glint:collectExtractProps', args);
            // },
            // getComponentDirectives(...args) {
            //   return sendTsRequest('glint:getComponentDirectives', args);
            // },
            // getComponentEvents(...args) {
            //   return sendTsRequest('glint:getComponentEvents', args);
            // },
            // getComponentNames(...args) {
            //   return sendTsRequest('glint:getComponentNames', args);
            // },
            // getComponentProps(...args) {
            //   return sendTsRequest('glint:getComponentProps', args);
            // },
            // getElementAttrs(...args) {
            //   return sendTsRequest('glint:getElementAttrs', args);
            // },
            // getElementNames(...args) {
            //   return sendTsRequest('glint:getElementNames', args);
            // },
            // getImportPathForFile(...args) {
            //   return sendTsRequest('glint:getImportPathForFile', args);
            // },
            // getPropertiesAtLocation(...args) {
            //   return sendTsRequest('glint:getPropertiesAtLocation', args);
            // },
            // getQuickInfoAtPosition(...args) {
            //   return sendTsRequest('glint:getQuickInfoAtPosition', args);
            // },
          }
        : undefined,
    ),
  );

  function sendTsRequest<T>(command: string, args: any): Promise<T | null> {
    return connection.sendRequest<T>(options.typescript.requestForwardingCommand!, [command, args]);
  }

  function createLs(server: LanguageServer, tsconfigFileName: string | undefined) {
    if (!tsconfigFileName) {
      throw new Error('tsconfigFileName is required');
    }

    const configLoader = new ConfigLoader();
    const glintConfig = configLoader.configForFile(tsconfigFileName);

    if (!glintConfig) {
      throw new Error('glintConfig is required');
    }

    const emberLanguagePlugin = createEmberLanguagePlugin(glintConfig);
    const language = createLanguage<URI>(
      [
        {
          getLanguageId: (uri) => server.documents.get(uri)?.languageId,
        },
        emberLanguagePlugin,
      ],
      createUriMap(),
      (uri) => {
        const document = server.documents.get(uri);
        if (document) {
          language.scripts.set(uri, document.getSnapshot(), document.languageId);
        } else {
          language.scripts.delete(uri);
        }
      },
    );
    return createLanguageService(
      language,
      server.languageServicePlugins,
      createLanguageServiceEnvironment(server, [...server.workspaceFolders.all]),
      {},
      // { vue: { compilerOptions: commonLine.vueOptions } },
    );
  }
});

connection.onInitialized(server.initialized);

connection.onShutdown(server.shutdown);

function getHybridModeLanguageServicePluginsForLanguageServer(
  ts: typeof import('typescript'),
  getTsPluginClient: any,
  // getTsPluginClient: import('@glint/tsserver/lib/requests').Requests | undefined,
) {
  const plugins = [
    // createTypeScriptSyntacticPlugin(ts),
    // createTypeScriptDocCommentTemplatePlugin(ts),
    ...getCommonLanguageServicePluginsForLanguageServer(ts, () => getTsPluginClient),
  ];
  for (const plugin of plugins) {
    // avoid affecting TS plugin
    delete plugin.capabilities.semanticTokensProvider;
  }
  return plugins;
}

function getCommonLanguageServicePluginsForLanguageServer(
  ts: typeof import('typescript'),
  getTsPluginClient: (context: LanguageServiceContext) => any,
  // ) => import('@glint/tsserver/lib/requests').Requests | undefined,
): LanguageServicePlugin[] {
  return [
    // createTypeScriptTwoslashQueriesPlugin(ts),
    // createCssPlugin(),
    // createPugFormatPlugin(),
    // createJsonPlugin(),
    // createVueTemplatePlugin('html', getTsPluginClient),
    // createVueTemplatePlugin('pug', getTsPluginClient),
    // createVueMissingPropsHintsPlugin(getTsPluginClient),
    // createVueCompilerDomErrorsPlugin(),
    // createVueSfcPlugin(),
    // createVueTwoslashQueriesPlugin(getTsPluginClient),
    // createVueDocumentLinksPlugin(),
    // createVueDocumentDropPlugin(ts, getTsPluginClient),
    // createVueCompleteDefineAssignmentPlugin(),
    // createVueAutoDotValuePlugin(ts, getTsPluginClient),
    // createVueAutoAddSpacePlugin(),
    // createVueInlayHintsPlugin(ts),
    // createVueDirectiveCommentsPlugin(),
    // createVueExtractFilePlugin(ts, getTsPluginClient),
    // createEmmetPlugin({
    // 	mappedLanguages: {
    // 		'vue-root-tags': 'html',
    // 		'postcss': 'scss',
    // 	},
    // }),
    // {
    // 	name: 'vue-parse-sfc',
    // 	capabilities: {
    // 		executeCommandProvider: {
    // 			commands: [commands.parseSfc],
    // 		},
    // 	},
    // 	create() {
    // 		return {
    // 			executeCommand(_command, [source]) {
    // 				return parse(source);
    // 			},
    // 		};
    // 	},
    // },
    // {
    // 	name: 'vue-name-casing',
    // 	capabilities: {
    // 		executeCommandProvider: {
    // 			commands: [
    // 				commands.detectNameCasing,
    // 				commands.convertTagsToKebabCase,
    // 				commands.convertTagsToPascalCase,
    // 				commands.convertPropsToKebabCase,
    // 				commands.convertPropsToCamelCase,
    // 			],
    // 		}
    // 	},
    // 	create(context) {
    // 		return {
    // 			executeCommand(command, [uri]) {
    // 				if (command === commands.detectNameCasing) {
    // 					return detect(context, URI.parse(uri));
    // 				}
    // 				else if (command === commands.convertTagsToKebabCase) {
    // 					return convertTagName(context, URI.parse(uri), TagNameCasing.Kebab, getTsPluginClient(context));
    // 				}
    // 				else if (command === commands.convertTagsToPascalCase) {
    // 					return convertTagName(context, URI.parse(uri), TagNameCasing.Pascal, getTsPluginClient(context));
    // 				}
    // 				else if (command === commands.convertPropsToKebabCase) {
    // 					return convertAttrName(context, URI.parse(uri), AttrNameCasing.Kebab, getTsPluginClient(context));
    // 				}
    // 				else if (command === commands.convertPropsToCamelCase) {
    // 					return convertAttrName(context, URI.parse(uri), AttrNameCasing.Camel, getTsPluginClient(context));
    // 				}
    // 			},
    // 		};
    // 	},
    // }
  ];
}
