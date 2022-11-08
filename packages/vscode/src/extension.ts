import { sync as resolve } from 'resolve';
import { createRequire } from 'node:module';
import type { ExtensionContext, WorkspaceFolder, FileSystemWatcher, TextEditor } from 'vscode';
import { Disposable, LanguageClient, ServerOptions } from 'vscode-languageclient/node.js';
import type { Request, GetIRRequest } from '@glint/core/lsp-messages';

// Code only injects itself for `require`, not `import`
const vscode = createRequire(import.meta.url)('vscode') as typeof import('vscode');
const { Range, window, commands, workspace } = vscode;

///////////////////////////////////////////////////////////////////////////////
// Setup and extension lifecycle

const outputChannel = window.createOutputChannel('Glint Language Server');
const clients = new Map<string, LanguageClient>();
const extensions = ['.js', '.ts', '.gjs', '.gts', '.hbs'];
const filePattern = `**/*{${extensions.join(',')}}`;

export function activate(context: ExtensionContext): void {
  let fileWatcher = workspace.createFileSystemWatcher(filePattern);

  context.subscriptions.push(fileWatcher, createConfigWatcher());
  context.subscriptions.push(
    commands.registerCommand('glint.restart-language-server', restartClients),
    commands.registerTextEditorCommand('glint.show-debug-ir', showDebugIR)
  );

  workspace.workspaceFolders?.forEach((folder) => addWorkspaceFolder(folder, fileWatcher));
  workspace.onDidChangeWorkspaceFolders(({ added, removed }) => {
    added.forEach((folder) => addWorkspaceFolder(folder, fileWatcher));
    removed.forEach((folder) => removeWorkspaceFolder(folder));
  });
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

async function showDebugIR(editor: TextEditor): Promise<void> {
  let workspaceFolder = workspace.getWorkspaceFolder(editor.document.uri);
  if (!workspaceFolder) {
    return;
  }

  let { document } = editor;
  let client = clients.get(workspaceFolder.uri.fsPath);
  let request = requestKey<typeof GetIRRequest>('glint/getIR');
  let response = await client?.sendRequest(request, { uri: document.uri.toString() });
  if (!response) {
    return;
  }

  let start = document.positionAt(0);
  let end = document.positionAt(document.getText().length);
  let transformedContents = response;

  await editor.edit((edit) => {
    edit.replace(new Range(start, end), transformedContents);
  });
}

///////////////////////////////////////////////////////////////////////////////
// Workspace folder management

async function addWorkspaceFolder(
  workspaceFolder: WorkspaceFolder,
  watcher: FileSystemWatcher
): Promise<void> {
  let folderPath = workspaceFolder.uri.fsPath;
  if (clients.has(folderPath)) return;

  let serverPath = findLanguageServer(folderPath);
  if (!serverPath) return;

  let serverOptions: ServerOptions = { module: serverPath };
  let client = new LanguageClient('glint', 'Glint', serverOptions, {
    workspaceFolder,
    outputChannel,
    documentSelector: [{ scheme: 'file', pattern: `${folderPath}/${filePattern}` }],
    synchronize: { fileEvents: watcher },
  });

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

function findLanguageServer(basedir: string): string | null {
  try {
    return resolve('@glint/core/bin/glint-language-server', { basedir });
  } catch {
    // Many workspaces with `tsconfig` files won't be Glint projects, so it's totally fine for us to
    // just bail out if we don't see `@glint/core`. If someone IS expecting Glint to run for this
    // project, though, we leave a message in our channel explaining why we didn't launch.
    outputChannel.appendLine(
      `Unable to resolve @glint/core from ${basedir} — not launching Glint for this directory.`
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

// This allows us to just use a bare string key for performing a request while maintaining
// type information for the request _without_ forcing us to import runtime code from
// `@glint/core` into the extension.
function requestKey<R extends Request<string, unknown>>(name: R['name']): R['type'] {
  return name as unknown as R['type'];
}
