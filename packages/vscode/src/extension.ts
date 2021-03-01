import { ExtensionContext, workspace, window, WorkspaceFolder } from 'vscode';
import {
  Disposable,
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
} from 'vscode-languageclient/node';
import { sync as resolve } from 'resolve';

module.exports = {
  activate(context: ExtensionContext) {
    workspace.workspaceFolders?.forEach((folder) => addWorkspaceFolder(folder, context));
    workspace.onDidChangeWorkspaceFolders(({ added, removed }) => {
      added.forEach((folder) => addWorkspaceFolder(folder, context));
      removed.forEach((folder) => removeWorkspaceFolder(folder, context));
    });
  },
};

const outputChannel = window.createOutputChannel('Glint Language Server');
const clients = new Map<string, Disposable>();

function addWorkspaceFolder(workspaceFolder: WorkspaceFolder, context: ExtensionContext): void {
  let folderPath = workspaceFolder.uri.fsPath;
  if (clients.has(folderPath)) return;

  let executable = {
    command: 'node',
    args: [resolve('@glint/core/bin/glint-language-server', { basedir: folderPath })],
  };

  let serverOptions: ServerOptions = {
    run: executable,
    debug: executable,
  };

  let clientOptions: LanguageClientOptions = {
    workspaceFolder,
    outputChannel,
    documentSelector: [
      {
        scheme: 'file',
        language: 'handlebars',
        pattern: `${folderPath}/**/*`,
      },
      {
        scheme: 'file',
        language: 'typescript',
        pattern: `${folderPath}/**/*`,
      },
    ],
    synchronize: {
      fileEvents: workspace.createFileSystemWatcher(`${folderPath}/**/*.{ts,hbs}`),
    },
  };

  const client = new LanguageClient('glint', 'Glint', serverOptions, clientOptions);
  const disposable = client.start();

  context.subscriptions.push(disposable);
  clients.set(folderPath, disposable);
}

function removeWorkspaceFolder(workspaceFolder: WorkspaceFolder, context: ExtensionContext): void {
  let folderPath = workspaceFolder.uri.fsPath;
  let client = clients.get(folderPath);
  if (client) {
    clients.delete(folderPath);
    context.subscriptions.splice(context.subscriptions.indexOf(client), 1);
    client.dispose();
  }
}
