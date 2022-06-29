import {
  ExtensionContext,
  workspace,
  window,
  WorkspaceFolder,
  FileSystemWatcher,
  commands,
} from 'vscode';
import { LanguageClient, ServerOptions } from 'vscode-languageclient/node';
import { sync as resolve } from 'resolve';

const outputChannel = window.createOutputChannel('Glint Language Server');
const clients = new Map<string, LanguageClient>();
const extensions = ['.js', '.ts', '.gjs', '.gts', '.hbs'];
const filePattern = `**/*{${extensions.join(',')}}`;

export function activate(context: ExtensionContext): void {
  let watcher = workspace.createFileSystemWatcher(filePattern);

  context.subscriptions.push(watcher);

  workspace.workspaceFolders?.forEach((folder) => addWorkspaceFolder(folder, watcher));
  workspace.onDidChangeWorkspaceFolders(({ added, removed }) => {
    added.forEach((folder) => addWorkspaceFolder(folder, watcher));
    removed.forEach((folder) => removeWorkspaceFolder(folder));
  });
}

export async function deactivate(): Promise<void> {
  await Promise.all([...clients.values()].map((client) => client.stop()));
}


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
