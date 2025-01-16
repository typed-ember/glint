import * as lsp from '@volar/vscode';
import {
  executeCommand,
  nextTick,
  useActiveTextEditor,
  useCommand,
  useOutputChannel,
  useVisibleTextEditors,
  useVscodeContext,
  watch,
} from 'reactive-vscode';
import * as vscode from 'vscode';
import { config } from './config';
// import { activate as activateDoctor } from './features/doctor';
// import { activate as activateNameCasing } from './features/nameCasing';
// import { activate as activateSplitEditors } from './features/splitEditors';
import {
  enabledHybridMode,
  enabledTypeScriptPlugin,
  useHybridModeStatusItem,
  useHybridModeTips,
} from './hybrid-mode';
import { NullLiteral } from 'typescript';
// import { useInsidersStatusItem } from './insiders';

let client: lsp.BaseLanguageClient;

type GlintInitializationOptions = any;

type CreateLanguageClient = (
  id: string,
  name: string,
  langs: lsp.DocumentSelector,
  initOptions: GlintInitializationOptions,
  port: number,
  outputChannel: vscode.OutputChannel,
) => lsp.BaseLanguageClient | null;

/**
 * A workspace consists of 1+ open folders. This function will watch one of
 * those folders to see if file has been opened with a known language ID
 * (e.g. 'glimmer-ts', 'handlebars', etc.). When that happens we
 * invoke the `createLanguageClient` function to create a language server
 * client.
 */
export function watchWorkspaceFolderForLanguageClientActivation(
  context: vscode.ExtensionContext,
  workspaceFolder: vscode.WorkspaceFolder,
  createLanguageClient: CreateLanguageClient,
): () => void {
  // for each
  const activeTextEditor = useActiveTextEditor();
  const visibleTextEditors = useVisibleTextEditors();

  let clientPromise: Promise<lsp.BaseLanguageClient | null> | null = null;

  useHybridModeTips();

  const { stop } = watch(
    activeTextEditor,
    () => {
      if (
        visibleTextEditors.value.some((editor) =>
          config.server.includeLanguages.includes(editor.document.languageId),
        )
      ) {
        if (!clientPromise) {
          clientPromise = activateLanguageClient(context, createLanguageClient, workspaceFolder);

          // disable this watcher so that we don't keep activation language client
          nextTick(() => {
            stop();
          });
        }
      }
    },
    {
      immediate: true, // causes above callback to be run immediately (i.e. not lazily)
    },
  );

  return () => {
    // Stop the watcher.
    stop();

    // Tear down the client if it exists.
    if (clientPromise) {
      clientPromise.then((client) => client?.stop());
      clientPromise = null;
    }
  };
}

let hasInitialized = false;

async function activateLanguageClient(
  context: vscode.ExtensionContext,
  createLanguageClient: CreateLanguageClient,
  workspaceFolder: vscode.WorkspaceFolder,
): Promise<lsp.BaseLanguageClient | null> {
  // This is not used now but can be used to conditionally reveal commands that should
  // only be visible when glint has been activated.
  useVscodeContext('glint.activated', true);

  const outputChannel = useOutputChannel('Glint Language Server');
  const documentSelectors = config.server.includeLanguages.map((language) => ({
    language,
    scheme: 'file',
    pattern: `${workspaceFolder.uri.fsPath}/**/*`,
  }));

  // This might return null if there is no...
  const client = createLanguageClient(
    'glint',
    'Glint',
    documentSelectors,
    await getInitializationOptions(context, enabledHybridMode.value),
    6009,
    outputChannel,
  );

  if (!client) {
    return null;
  }

  if (!hasInitialized) {
    watch([enabledHybridMode, enabledTypeScriptPlugin], (newValues, oldValues) => {
      if (newValues[0] !== oldValues[0]) {
        requestReloadVscode(
          `Please reload VSCode to ${newValues[0] ? 'enable' : 'disable'} Hybrid Mode.`,
        );
      } else if (newValues[1] !== oldValues[1]) {
        requestReloadVscode(
          `Please reload VSCode to ${newValues[1] ? 'enable' : 'disable'} Glint TypeScript Plugin.`,
        );
      }
    });

    watch(
      () => config.server.includeLanguages,
      () => {
        if (enabledHybridMode.value) {
          requestReloadVscode('Please reload VSCode to apply the new language settings.');
        }
      },
    );

    // NOTE: this will fire when `glint.libraryPath` is changed, among others
    // (leaving this note here so I don't re-implement the `affectsConfiguration` logic we used
    // to have when changing this config value)
    watch(
      () => config.server,
      () => {
        if (!enabledHybridMode.value) {
          executeCommand('glint.restart-language-server', false);
        }
      },
      { deep: true },
    );

    useCommand('glint.restart-language-server', async (restartTsServer = true) => {
      if (restartTsServer) {
        await executeCommand('typescript.restartTsServer');
      }
      await client.stop();
      outputChannel.clear();
      client.clientOptions.initializationOptions = await getInitializationOptions(
        context,
        enabledHybridMode.value,
      );
      await client.start();
    });

    // activateDoctor(client);
    // activateNameCasing(client, selectors);
    // activateSplitEditors(client);

    lsp.activateAutoInsertion(documentSelectors, client);
    lsp.activateDocumentDropEdit(documentSelectors, client);
    lsp.activateWriteVirtualFiles('glint.action.writeVirtualFiles', client);

    if (!enabledHybridMode.value) {
      lsp.activateTsConfigStatusItem(documentSelectors, 'glint.tsconfig', client);
      lsp.activateTsVersionStatusItem(
        documentSelectors,
        'glint.tsversion',
        context,
        (text) => 'TS ' + text,
      );
      lsp.activateFindFileReferences('glint.findAllFileReferences', client);
    }

    useHybridModeStatusItem();
    // useInsidersStatusItem(context);
  }

  hasInitialized = true;

  async function requestReloadVscode(msg: string): Promise<void> {
    const reload = await vscode.window.showInformationMessage(msg, 'Reload Window');
    if (reload) {
      executeCommand('workbench.action.reloadWindow');
    }
  }

  return client;
}

async function getInitializationOptions(
  context: vscode.ExtensionContext,
  hybridMode: boolean,
): Promise<GlintInitializationOptions> {
  return {
    typescript: { tsdk: (await lsp.getTsdk(context))!.tsdk },
    glint: { hybridMode },
  };
}
