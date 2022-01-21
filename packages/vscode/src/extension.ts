import { ExtensionContext, workspace, window, WorkspaceFolder } from 'vscode';
import {
  Disposable,
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
} from 'vscode-languageclient/node';
import { sync as resolve } from 'resolve';
import type { GlintConfig } from '@glint/config';

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
let debugServerPortNumber = 6009;

function addWorkspaceFolder(workspaceFolder: WorkspaceFolder, context: ExtensionContext): void {
  let folderPath = workspaceFolder.uri.fsPath;
  if (clients.has(folderPath)) return;

  let executable = {
    command: 'node',
    args: [resolve('@glint/core/bin/glint-language-server', { basedir: folderPath })],
  };

  // Runs the server in Node's Inspector mode so VS Code can attach to the server for debugging
  let debugExecutable = {
    ...executable,
    args: ['--nolazy', `--inspect=${debugServerPortNumber++}`, ...executable.args],
  };

  let serverOptions: ServerOptions = {
    run: executable,
    debug: debugExecutable,
  };

  let { loadConfig } = require(resolve('@glint/config', { basedir: folderPath }));
  let config: GlintConfig = loadConfig(folderPath);

  // Older versions of Glint won't have `getConfiguredFileExtensions`, so fallback to safe defaults.
  let extensions = config.environment.getConfiguredFileExtensions?.() ?? ['.js', '.ts', '.hbs'];
  let filePattern = `${folderPath}/**/*{${extensions.join(',')}}`;

  let clientOptions: LanguageClientOptions = {
    workspaceFolder,
    outputChannel,
    documentSelector: [{ scheme: 'file', pattern: filePattern }],
    synchronize: {
      fileEvents: workspace.createFileSystemWatcher(filePattern),
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
