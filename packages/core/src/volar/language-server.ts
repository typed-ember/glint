import { createLanguage } from '@volar/language-core';
import type { LanguagePlugin, LanguageServer } from '@volar/language-server';
import { createLanguageServiceEnvironment } from '@volar/language-server/lib/project/simpleProject.js';
import { createConnection, createServer } from '@volar/language-server/node.js';
import type { LanguageServiceContext, LanguageServicePlugin } from '@volar/language-service';
import { createLanguageService, createUriMap, LanguageService } from '@volar/language-service';
import * as path from 'node:path';
import * as ts from 'typescript';
import { create as createHtmlSyntacticPlugin } from 'volar-service-html';
import { create as createTypeScriptSyntacticPlugin } from 'volar-service-typescript/lib/plugins/syntactic.js';
import { URI } from 'vscode-uri';
import { GlintConfig } from '../config/config.js';
import { ConfigLoader } from '../config/loader.js';
import { create as createCompilerErrorsPlugin } from '../plugins/g-compiler-errors.js';
import { create as createTemplateTagSymbolsPlugin } from '../plugins/g-template-tag-symbols.js';
import { createEmberLanguagePlugin } from './ember-language-plugin.js';

const connection = createConnection();
const server = createServer(connection);
const tsserverRequestHandlers = new Map<number, (res: any) => void>();

const logInfo = (message: string): void => {
  connection.console.info(`[Glint] ${message}`);
};

const logWarn = (message: string): void => {
  connection.console.warn(`[Glint] ${message}`);
};

let tsserverRequestId = 0;

connection.listen();

connection.onNotification('tsserver/response', ([id, res]) => {
  tsserverRequestHandlers.get(id)?.(res);
  tsserverRequestHandlers.delete(id);
});

/**
 * Handle the `initialize` request from the client. This is the first request sent by the client to
 * the server. It includes the set of capabilities supported by the client as well as
 * other initialization params needed by the server.
 */
connection.onInitialize((params) => {
  logInfo('Language server initializing.');
  if (params.workspaceFolders && params.workspaceFolders.length > 0) {
    const folders = params.workspaceFolders.map((folder) => folder.uri).join(', ');
    logInfo(`Workspace folders: ${folders}`);
  } else if (params.rootUri) {
    logInfo(`Workspace root: ${params.rootUri}`);
  } else {
    logWarn('No workspace folder or root URI provided by client.');
  }

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
  let warnedMissingProjectInfo = false;
  let warnedSimpleLs = false;

  return server.initialize(
    params,
    {
      setup() {},
      async getLanguageService(uri) {
        if (uri.scheme === 'file') {
          // Use tsserver to find the tsconfig governing this file.
          const fileName = uri.fsPath.replace(/\\/g, '/');
          let projectInfo = await sendTsServerRequest<ts.server.protocol.ProjectInfo>(
            '_glint:' + ts.server.protocol.CommandTypes.ProjectInfo,
            {
              file: fileName,
              needFileNameList: false,
            } satisfies ts.server.protocol.ProjectInfoRequestArgs,
          );
          if (!projectInfo) {
            projectInfo = await sendTsServerRequest<ts.server.protocol.ProjectInfo>(
              ts.server.protocol.CommandTypes.ProjectInfo,
              {
                file: fileName,
                needFileNameList: false,
              } satisfies ts.server.protocol.ProjectInfoRequestArgs,
            );
          }
          if (projectInfo) {
            const { configFileName } = projectInfo;
            let ls = tsconfigProjects.get(URI.file(configFileName));
            if (!ls) {
              ls = createLanguageServiceHelper(server, configFileName);
              tsconfigProjects.set(URI.file(configFileName), ls);
            }
            return ls;
          } else if (!warnedMissingProjectInfo) {
            warnedMissingProjectInfo = true;
            logWarn(`No tsserver project info for ${fileName}; falling back to simple LS.`);
          }
        }
        // This branch is hit when there's no tsconfig/jsconfig project (e.g. Volar Labs
        // or projects without config files). We create a "simple" LS with a default GlintConfig
        // so that .gts/.gjs template parsing still works.
        if (!warnedSimpleLs) {
          warnedSimpleLs = true;
          logWarn('Using simple language service without a tsconfig/jsconfig.');
        }
        return (simpleLs ??= createLanguageServiceHelper(server, undefined));
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
    getHybridModeLanguageServicePluginsForLanguageServer({
      // TODO: Implement Glint-specific tsserver requests similar to Vue
      // For now, keeping the basic structure ready for future implementation
      // getQuickInfoAtPosition(...args) {
      //   return sendTsServerRequest('_glint:quickinfo', args);
      // },
      // getDocumentHighlights(...args) {
      //   return sendTsServerRequest('_glint:documentHighlights-full', args);
      // },
      // getEncodedSemanticClassifications(...args) {
      //   return sendTsServerRequest('_glint:encodedSemanticClassifications-full', args);
      // },
    }),
  );

  async function sendTsServerRequest<T>(command: string, args: any): Promise<T | null> {
    return await new Promise<T | null>((resolve) => {
      const requestId = ++tsserverRequestId;
      tsserverRequestHandlers.set(requestId, resolve);
      connection.sendNotification('tsserver/request', [requestId, command, args]);
    });
  }

  function createLanguageServiceHelper(
    server: LanguageServer,
    tsconfigFileName: string | undefined,
  ): LanguageService {
    const languagePlugins: LanguagePlugin<URI>[] = [
      {
        getLanguageId: (uri) => server.documents.get(uri)?.languageId,
      },
    ];

    if (tsconfigFileName) {
      const configLoader = new ConfigLoader(logInfo);
      const glintConfig = configLoader.configForFile(tsconfigFileName);
      if (glintConfig) {
        logInfo(`Glint config active for ${tsconfigFileName}.`);
        const emberLanguagePlugin = createEmberLanguagePlugin(glintConfig);
        languagePlugins.push(emberLanguagePlugin);
      } else {
        logWarn(`Glint config not found for ${tsconfigFileName}; Glint features disabled.`);
      }
    } else {
      logWarn('No tsconfig/jsconfig provided; creating Glint config with defaults.');

      // Even without a tsconfig/jsconfig, we can still provide template parsing
      // and language features for .gts/.gjs files by creating a default GlintConfig
      // rooted at the first workspace folder.
      // We use the already-imported `ts` module rather than trying to resolve TypeScript
      // from the workspace, since the language server already has it available.
      const workspaceFolders = [...server.workspaceFolders.all];
      const workspaceRoot =
        workspaceFolders.length > 0 ? workspaceFolders[0].fsPath : process.cwd();

      const syntheticConfigPath = path.join(workspaceRoot, 'tsconfig.json');
      const glintConfig = new GlintConfig(ts, syntheticConfigPath, { environment: [] });
      const emberLanguagePlugin = createEmberLanguagePlugin(glintConfig);
      languagePlugins.push(emberLanguagePlugin);
      logInfo(`Glint config active for workspace root ${workspaceRoot} (no tsconfig).`);
    }

    const language = createLanguage<URI>(languagePlugins, createUriMap(), (uri) => {
      const document = server.documents.get(uri);
      if (document) {
        language.scripts.set(uri, document.getSnapshot(), document.languageId);
      } else {
        language.scripts.delete(uri);
      }
    });
    return createLanguageService(
      language,
      server.languageServicePlugins,
      createLanguageServiceEnvironment(server, [...server.workspaceFolders.all]),
      {},
    );
  }
});

connection.onInitialized(server.initialized);

connection.onShutdown(server.shutdown);

function getHybridModeLanguageServicePluginsForLanguageServer(
  tsPluginClient: any = {}, // Glint's equivalent to Vue's tsPluginClient
): LanguageServicePlugin<any>[] {
  const plugins = [
    // Lightweight syntax-only TS Language Service. Provides Symbols (e.g. Outline view) and other features.
    createTypeScriptSyntacticPlugin(ts),
    createHtmlSyntacticPlugin(),
    ...getCommonLanguageServicePluginsForLanguageServer(() => tsPluginClient),
  ];
  for (const plugin of plugins) {
    // avoid affecting TS plugin
    delete plugin.capabilities.semanticTokensProvider;
  }
  return plugins;
}

function getCommonLanguageServicePluginsForLanguageServer(
  getTsPluginClient: (context: LanguageServiceContext) => any,
  // ) => import('@glint/tsserver/lib/requests').Requests | undefined,
): LanguageServicePlugin[] {
  return [
    createTemplateTagSymbolsPlugin(),
    createCompilerErrorsPlugin(),
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
