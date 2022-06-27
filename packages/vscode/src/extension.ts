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

  let serverArgs = [];
  try {
    serverArgs.unshift(resolve('@glint/core/bin/glint-language-server', { basedir: folderPath }));
  } catch {
    // Many workspaces with `tsconfig` files won't be Glint projects, so it's totally fine for us to
    // just bail out if we don't see `@glint/core`. If someone IS expecting Glint to run for this
    // project, though, we leave a message in our channel explaining why we didn't launch.
    outputChannel.appendLine(
      `Unable to resolve @glint/core from ${folderPath} — not launching Glint for this directory.`
    );
    return;
  }

  let serverOptions: ServerOptions = {
    run: { command: 'node', args: serverArgs },
    debug: { command: 'node', args: ['--nolazy', `--inspect`, ...serverArgs] },
  };

  let extensions = ['.js', '.ts', '.gjs', '.gts', '.hbs'];
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
