import { createRequire } from 'node:module';
import * as path from 'node:path';
import type TS from 'typescript';
import { createLanguage } from '@volar/language-core';
import type { LanguagePlugin, LanguageServer } from '@volar/language-server';
import { createLanguageServiceEnvironment } from '@volar/language-server/lib/project/simpleProject.js';
import { createConnection, createServer } from '@volar/language-server/node.js';
import type { LanguageServiceContext, LanguageServicePlugin } from '@volar/language-service';
import { createLanguageService, createUriMap, LanguageService } from '@volar/language-service';
import { create as createHtmlSyntacticPlugin } from 'volar-service-html';
import { create as createTypeScriptSyntacticPlugin } from 'volar-service-typescript/lib/plugins/syntactic.js';
import { URI } from 'vscode-uri';
import { ConfigLoader } from '../config/loader.js';
import { createDefaultConfig } from '../config/index.js';
import { create as createCompilerErrorsPlugin } from '../plugins/g-compiler-errors.js';
import { create as createComponentHoverPlugin } from '../plugins/g-component-hover.js';
import type { ComponentMeta, TsPluginClient } from '../plugins/g-component-hover.js';
import { create as createTemplateTagSymbolsPlugin } from '../plugins/g-template-tag-symbols.js';
import { createEmberLanguagePlugin } from './ember-language-plugin.js';

const require = createRequire(import.meta.url);

/**
 * Resolve TypeScript with fallback to a path provided by the host (e.g., VS Code's built-in TypeScript).
 * This allows the language server to work even when the user's project doesn't have `typescript`
 * as a direct dependency (only `@glint/ember-tsc` which has it as a peerDep).
 */
function resolveTypeScript(): typeof import('typescript') {
  // Try normal resolution (project's TypeScript or ember-tsc's peer dep)
  try {
    return require('typescript');
  } catch {
    // ignore
  }

  // Fall back to TypeScript path provided by the VS Code extension
  const fallbackPath = process.env['GLINT_TYPESCRIPT_PATH'];
  if (fallbackPath) {
    try {
      return require(fallbackPath);
    } catch {
      // ignore
    }
  }

  throw new Error('TypeScript could not be resolved. Please install `typescript` as a dependency.');
}

const ts = resolveTypeScript();

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
          const projectInfo = await sendTsServerRequest<TS.server.protocol.ProjectInfo>(
            '_glint:' + ts.server.protocol.CommandTypes.ProjectInfo,
            {
              file: fileName,
              needFileNameList: false,
            } satisfies TS.server.protocol.ProjectInfoRequestArgs,
          );
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
        // TODO: this branch is hit when running Volar Labs and currently breaks. Figure out
        // how to reinstate a "simple" LS without a tsconfig.
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
      async getComponentMeta(fileName: string, tagName: string): Promise<ComponentMeta | null> {
        return sendTsServerRequest<ComponentMeta | null>('_glint:getComponentMeta', {
          file: fileName,
          tagName,
        });
      },
    } satisfies TsPluginClient),
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

    {
      let glintConfig = null;
      const isRealConfigFile =
        tsconfigFileName &&
        !tsconfigFileName.startsWith('/dev/null') &&
        tsconfigFileName.endsWith('.json');
      if (isRealConfigFile) {
        const configLoader = new ConfigLoader(logInfo, ts);
        glintConfig = configLoader.configForFile(tsconfigFileName);
      }
      if (!glintConfig) {
        const rootDir = isRealConfigFile
          ? path.dirname(tsconfigFileName!)
          : params.workspaceFolders?.[0]
            ? URI.parse(params.workspaceFolders[0].uri).fsPath
            : process.cwd();
        logInfo(`Using default Glint config for ${rootDir}.`);
        glintConfig = createDefaultConfig(ts, rootDir);
      }
      logInfo(`Glint config active for ${tsconfigFileName ?? 'default'}.`);
      const emberLanguagePlugin = createEmberLanguagePlugin(glintConfig);
      languagePlugins.push(emberLanguagePlugin);
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
  tsPluginClient: TsPluginClient,
): LanguageServicePlugin<any>[] {
  const plugins = [
    // Lightweight syntax-only TS Language Service. Provides Symbols (e.g. Outline view) and other features.
    createTypeScriptSyntacticPlugin(ts),
    createHtmlSyntacticPlugin(),
    ...getCommonLanguageServicePluginsForLanguageServer(tsPluginClient),
  ];
  for (const plugin of plugins) {
    // avoid affecting TS plugin
    delete plugin.capabilities.semanticTokensProvider;
  }
  return plugins;
}

function getCommonLanguageServicePluginsForLanguageServer(
  tsPluginClient: TsPluginClient,
): LanguageServicePlugin[] {
  return [
    createTemplateTagSymbolsPlugin(),
    createCompilerErrorsPlugin(),
    createComponentHoverPlugin(() => tsPluginClient),
  ];
}
