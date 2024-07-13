import { createRequire } from 'node:module';
import * as path from 'node:path';
import {
  ExtensionContext,
  WorkspaceFolder,
  FileSystemWatcher,
  window,
  extensions,
  commands,
  workspace,
  WorkspaceConfiguration,
} from 'vscode';
import * as languageServerProtocol from '@volar/language-server/protocol.js';
import {
  LabsInfo,
  createLabsInfo,
  getTsdk,
} from '@volar/vscode';

import { Disposable, LanguageClient, ServerOptions } from '@volar/vscode/node.js';

///////////////////////////////////////////////////////////////////////////////
// Setup and extension lifecycle

const outputChannel = window.createOutputChannel('Glint Language Server');
const clients = new Map<string, LanguageClient>();
const fileExtensions = ['.js', '.ts', '.gjs', '.gts', '.hbs'];
const filePattern = `**/*{${fileExtensions.join(',')}}`;

export function activate(context: ExtensionContext): LabsInfo {
  // We need to activate the default VSCode TypeScript extension so that our
  // TS Plugin kicks in. We do this because the TS extension is (obviously) not
  // configured to activate for, say, .gts files:
  // https://github.com/microsoft/vscode/blob/878af07/extensions/typescript-language-features/package.json#L62..L75
  extensions.getExtension('vscode.typescript-language-features')?.activate()

  // TODO: Volar: i think this happens as part of dynamic registerCapability, i.e.
  // I think maybe we can remove this from `activate` and wait for it to happen
  // when the server sends the registerCapability questions for all dynamicRegistration=true capabilities.
  let fileWatcher = workspace.createFileSystemWatcher(filePattern);

  context.subscriptions.push(fileWatcher, createConfigWatcher());
  context.subscriptions.push(
    commands.registerCommand('glint.restart-language-server', restartClients),
  );

  // TODO: how to each multiple workspace reloads with VolarLabs?
  const volarLabs = createLabsInfo(languageServerProtocol);

  workspace.workspaceFolders?.forEach((folder) =>
    addWorkspaceFolder(context, folder, fileWatcher, volarLabs),
  );
  workspace.onDidChangeWorkspaceFolders(({ added, removed }) => {
    added.forEach((folder) => addWorkspaceFolder(context, folder, fileWatcher));
    removed.forEach((folder) => removeWorkspaceFolder(folder));
  });

  workspace.onDidChangeConfiguration((changeEvent) => {
    if (changeEvent.affectsConfiguration('glint.libraryPath')) {
      reloadAllWorkspaces(context, fileWatcher);
    }
  });

  return volarLabs.extensionExports;
}

export async function deactivate(): Promise<void> {
  await Promise.all([...clients.values()].map((client) => client.stop()));
}

///////////////////////////////////////////////////////////////////////////////
// Commands

async function restartClients(): Promise<void> {
  outputChannel.appendLine(`Restarting Glint language server...`);
  await Promise.all([...clients.values()].map((client) => client.restart()));
}

///////////////////////////////////////////////////////////////////////////////
// Workspace folder management

async function reloadAllWorkspaces(
  context: ExtensionContext,
  fileWatcher: FileSystemWatcher,
): Promise<void> {
  let folders = workspace.workspaceFolders ?? [];

  await Promise.all(
    folders.map(async (folder) => {
      await removeWorkspaceFolder(folder);
      await addWorkspaceFolder(context, folder, fileWatcher);
    }),
  );
}

async function addWorkspaceFolder(
  context: ExtensionContext,
  workspaceFolder: WorkspaceFolder,
  watcher: FileSystemWatcher,
  volarLabs?: ReturnType<typeof createLabsInfo>,
): Promise<void> {
  let folderPath = workspaceFolder.uri.fsPath;
  if (clients.has(folderPath)) return;

  let serverPath = findLanguageServer(folderPath);
  if (!serverPath) return;

  let serverOptions: ServerOptions = { module: serverPath };

  const typescriptFormatOptions = getOptions(workspace.getConfiguration('typescript'), 'format');
  const typescriptUserPreferences = getOptions(
    workspace.getConfiguration('typescript'),
    'preferences',
  );
  const javascriptFormatOptions = getOptions(workspace.getConfiguration('javascript'), 'format');
  const javascriptUserPreferences = getOptions(
    workspace.getConfiguration('javascript'),
    'preferences',
  );

  let client = new LanguageClient('glint', 'Glint', serverOptions, {
    workspaceFolder,
    outputChannel,
    initializationOptions: {
      javascript: {
        format: javascriptFormatOptions,
        preferences: javascriptUserPreferences,
      },
      typescript: {
        format: typescriptFormatOptions,
        preferences: typescriptUserPreferences,
        tsdk: (await getTsdk(context))!.tsdk,
      },
    },
    documentSelector: [{ scheme: 'file', pattern: `${folderPath}/${filePattern}` }],
    synchronize: { fileEvents: watcher },
  });

  if (volarLabs) {
    volarLabs.addLanguageClient(client);
  }

  clients.set(folderPath, client);

  await client.start();
}

async function removeWorkspaceFolder(workspaceFolder: WorkspaceFolder): Promise<void> {
  let folderPath = workspaceFolder.uri.fsPath;
  let client = clients.get(folderPath);
  if (client) {
    clients.delete(folderPath);
    await client.stop();
  }
}

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
