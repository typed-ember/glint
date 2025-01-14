import { createRequire } from 'node:module';
import * as path from 'node:path';
import * as lsp from '@volar/vscode/node';
import * as vscode from 'vscode';
import * as languageServerProtocol from '@volar/language-server/protocol.js';
import { LabsInfo, createLabsInfo, getTsdk } from '@volar/vscode';
import { config } from './config';

import { Disposable, LanguageClient, ServerOptions } from '@volar/vscode/node.js';
import {
  defineExtension,
  executeCommand,
  extensionContext,
  onDeactivate,
  useWorkspaceFolders,
  watchEffect,
} from 'reactive-vscode';
import {
  activate as activateLanguageClient,
  deactivate as deactivateLanguageClient,
} from './language-client';

export const { activate, deactivate } = defineExtension(async () => {
  const volarLabs = createLabsInfo(languageServerProtocol);

  const tsExtension = vscode.extensions.getExtension('vscode.typescript-language-features');

  if (tsExtension) {
    // We need to activate the default VSCode TypeScript extension so that our
    // TS Plugin kicks in. We do this because the TS extension is (obviously) not
    // configured to activate for, say, .gts files:
    // https://github.com/microsoft/vscode/blob/878af07/extensions/typescript-language-features/package.json#L62..L75

    await tsExtension.activate();
  } else {
    // TODO: we may decide to commit fully to TS Plugin mode, in which case it might be nice
    // to have the message displayed below to guide the user.
    // NOTE: Vue language tooling will continue to display this message even when willfully
    // setting hybrid mode to false (i.e. using old LS approach). If we want to continue to support
    // LS mode then we should leave this message commented out.
    // vscode.window
    //   .showWarningMessage(
    //     'Takeover mode is no longer needed since v2. Please enable the "TypeScript and JavaScript Language Features" extension.',
    //     'Show Extension',
    //   )
    //   .then((selected) => {
    //     if (selected) {
    //       executeCommand('workbench.extensions.search', '@builtin typescript-language-features');
    //     }
    //   });
  }

  const context = extensionContext.value!;

  const workspaceFolders = useWorkspaceFolders();

  watchEffect(() => {
    workspaceFolders.value?.forEach((workspaceFolder) => {
      activateLanguageClient(
        context,
        (id, name, documentSelector, initOptions, port, outputChannel) => {
          class _LanguageClient extends lsp.LanguageClient {
            override fillInitializeParams(params: lsp.InitializeParams) {
              // fix https://github.com/vuejs/language-tools/issues/1959
              params.locale = vscode.env.language;
            }
          }

          // vscode.workspace.workspaceFolders

          // Here we load the server module;
          // - Vue includes the server in the extension bundle
          // - Glint does not; expects it to come from workspace folder
          // let serverModule = vscode.Uri.joinPath(context.extensionUri, 'server.js');

          let folderPath = workspaceFolder.uri.fsPath;
          if (clients.has(folderPath)) return;

          let serverPath = findLanguageServer(folderPath);
          if (!serverPath) return;

          const runOptions: lsp.ForkOptions = {};
          // if (config.server.maxOldSpaceSize) {
          //   runOptions.execArgv ??= [];
          //   runOptions.execArgv.push('--max-old-space-size=' + config.server.maxOldSpaceSize);
          // }
          const debugOptions: lsp.ForkOptions = {
            execArgv: ['--nolazy', '--inspect=' + port],
          };
          const serverOptions: lsp.ServerOptions = {
            run: {
              module: serverPath,
              transport: lsp.TransportKind.ipc,
              options: runOptions,
            },
            debug: {
              module: serverPath,
              transport: lsp.TransportKind.ipc,
              options: debugOptions,
            },
          };
          const clientOptions: lsp.LanguageClientOptions = {
            // middleware,
            documentSelector: documentSelector,
            initializationOptions: initOptions,
            markdown: {
              isTrusted: true,
              supportHtml: true,
            },
            outputChannel,
          };
          const client = new _LanguageClient(id, name, serverOptions, clientOptions);
          client.start();

          volarLabs.addLanguageClient(client);

          updateProviders(client);
        },
      );

      onDeactivate(() => {
        deactivateLanguageClient();
      });
    });
  });

  // workspaceFolders.value.forEach((workspaceFolder) =>

  return volarLabs.extensionExports;
});

function updateProviders(client: lsp.LanguageClient) {
  const initializeFeatures = (client as any).initializeFeatures;

  (client as any).initializeFeatures = (...args: any) => {
    const capabilities = (client as any)._capabilities as lsp.ServerCapabilities;

    // NOTE: these are legacy config for Language Server and hence the VSCode options
    // for Vanilla TS; TS Plugin won't use these options but will rather the same
    // Vanilla TS options.
    //
    // if (!config.codeActions.enabled) {
    //   capabilities.codeActionProvider = undefined;
    // }
    // if (!config.codeLens.enabled) {
    //   capabilities.codeLensProvider = undefined;
    // }
    // if (
    //   !config.updateImportsOnFileMove.enabled &&
    //   capabilities.workspace?.fileOperations?.willRename
    // ) {
    //   capabilities.workspace.fileOperations.willRename = undefined;
    // }

    return initializeFeatures.call(client, ...args);
  };
}

// async function addWorkspaceFolder(
//   context: ExtensionContext,
//   workspaceFolder: WorkspaceFolder,
//   watcher: FileSystemWatcher,
//   volarLabs?: ReturnType<typeof createLabsInfo>,
// ): Promise<void> {
//   let folderPath = workspaceFolder.uri.fsPath;
//   if (clients.has(folderPath)) return;

//   let serverPath = findLanguageServer(folderPath);
//   if (!serverPath) return;

//   let serverOptions: ServerOptions = { module: serverPath };

//   const typescriptFormatOptions = getOptions(workspace.getConfiguration('typescript'), 'format');
//   const typescriptUserPreferences = getOptions(
//     workspace.getConfiguration('typescript'),
//     'preferences',
//   );
//   const javascriptFormatOptions = getOptions(workspace.getConfiguration('javascript'), 'format');
//   const javascriptUserPreferences = getOptions(
//     workspace.getConfiguration('javascript'),
//     'preferences',
//   );

//   let client = new LanguageClient('glint', 'Glint', serverOptions, {
//     workspaceFolder,
//     outputChannel,
//     initializationOptions: {
//       javascript: {
//         format: javascriptFormatOptions,
//         preferences: javascriptUserPreferences,
//       },
//       typescript: {
//         format: typescriptFormatOptions,
//         preferences: typescriptUserPreferences,
//         tsdk: (await getTsdk(context))!.tsdk,
//       },
//     },
//     documentSelector: [{ scheme: 'file', pattern: `${folderPath}/${filePattern}` }],
//     synchronize: { fileEvents: watcher },
//   });

//   if (volarLabs) {
//     volarLabs.addLanguageClient(client);
//   }

//   clients.set(folderPath, client);

//   await client.start();
// }

// async function removeWorkspaceFolder(workspaceFolder: WorkspaceFolder): Promise<void> {
//   let folderPath = workspaceFolder.uri.fsPath;
//   let client = clients.get(folderPath);
//   if (client) {
//     clients.delete(folderPath);
//     await client.stop();
//   }
// }

///////////////////////////////////////////////////////////////////////////////
// Utilities

function findLanguageServer(workspaceDir: string): string | null {
  let userLibraryPath = workspace.getConfiguration().get('glint.libraryPath', '.');
  let resolutionDir = path.resolve(workspaceDir, userLibraryPath);
  let require = createRequire(path.join(resolutionDir, 'package.json'));
  try {
    return require.resolve('@glint/core/bin/glint-language-server');
  } catch {
    // Many workspaces with `tsconfig` files won't be Glint projects, so it's totally fine for us to
    // just bail out if we don't see `@glint/core`. If someone IS expecting Glint to run for this
    // project, though, we leave a message in our channel explaining why we didn't launch.
    outputChannel.appendLine(
      `Unable to resolve @glint/core from ${resolutionDir} — not launching Glint for this directory.\n` +
        `If Glint is installed in a child directory, you may wish to set the 'glint.libraryPath' option ` +
        `in your workspace settings for the Glint VS Code extension.`,
    );

    return null;
  }
}

// Automatically restart running servers when config files in the workspace change
function createConfigWatcher(): Disposable {
  let configWatcher = workspace.createFileSystemWatcher('**/{ts,js}config*.json');

  configWatcher.onDidCreate(restartClients);
  configWatcher.onDidChange(restartClients);
  configWatcher.onDidDelete(restartClients);

  return configWatcher;
}

// Loads the TypeScript and JavaScript formating options from the workspace and subsets them to
// pass to the language server.
function getOptions(config: WorkspaceConfiguration, key: string): object {
  const formatOptions = config.get<object>(key);
  if (formatOptions) {
    return formatOptions;
  }

  return {};
}
