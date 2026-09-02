import * as languageServerProtocol from '@volar/language-server/protocol.js';
import {
  activateAutoInsertion,
  activateDocumentDropEdit,
  createLabsInfo,
  middleware,
} from '@volar/vscode';
import * as lsp from '@volar/vscode/node';
import { execFile } from 'node:child_process';
import * as fs from 'node:fs';
import { createRequire } from 'node:module';
import * as path from 'node:path';
// `reactive-vscode` ships a CommonJS build but only ESM-flavored types. This
// package is emitted as CommonJS and uses these helpers synchronously (e.g.
// `defineExtension` defines the extension's `activate`/`deactivate`), so we take
// the types via a type-only (import-mode) import and the runtime values via
// `require`, which resolves to the package's CommonJS build.
import type * as ReactiveVscode from 'reactive-vscode' with { 'resolution-mode': 'import' };
import * as vscode from 'vscode';

const {
  defineExtension,
  executeCommand,
  extensionContext,
  nextTick,
  onDeactivate,
  useActiveTextEditor,
  useCommand,
  useOutputChannel,
  useVisibleTextEditors,
  watch,
} = require('reactive-vscode') as typeof ReactiveVscode;

const V1_EXTENSION_ID = 'typed-ember.glint-vscode';
const V2_EXTENSION_ID = 'typed-ember.glint2-vscode';

let v1ExtensionPresent = false;

const extension = vscode.extensions.getExtension(V1_EXTENSION_ID);
if (extension) {
  v1ExtensionPresent = true;

  vscode.window
    .showErrorMessage(
      `The Glint V1 extension (typed-ember.glint-vscode) can not be enabled at the same time as the Glint V2 extension. Please disable one (either globally or in your workspace) and reload your workspace.`,
      'Go to Glint V1',
      'Go to Glint V2',
    )
    .then((action) => {
      if (action === 'Go to Glint V1') {
        vscode.commands.executeCommand('workbench.extensions.search', '@id:' + V1_EXTENSION_ID);
      }
      if (action === 'Go to Glint V2') {
        vscode.commands.executeCommand('workbench.extensions.search', '@id:' + V2_EXTENSION_ID);
      }
    });
}

let client: lsp.BaseLanguageClient | undefined;
let needRestart = false;

const languageIds = ['glimmer-js', 'glimmer-ts'];
const TS_PLUGIN_NAME = 'glint-tsserver-plugin-pack';
const EMBER_TSC_SOURCE_SETTING = 'glint2.emberTscSource';
const SELECT_EMBER_TSC_COMMAND = 'glint2.select-ember-tsc-source';
const TYPESCRIPT_7_SHOW_MENU_COMMAND = 'glint2.typescript7.showMenu';

type EmberTscSource = 'auto' | 'workspace' | 'bundled';

export const { activate, deactivate } = defineExtension(() => {
  if (v1ExtensionPresent) {
    return;
  }

  const context = extensionContext.value!;
  const outputChannel = useOutputChannel('Glint2 Language Server');

  // Glint's language server and tsserver plugin require the TypeScript 5/6
  // JS API, which TypeScript 7 does not ship. When TypeScript 7 is in play,
  // they would only produce broken diagnostics, so Glint stands down entirely:
  // template type-checking comes from a content mapper run by TypeScript
  // itself instead. The only work left is telling the native server about
  // the file extensions.
  const typeScript7Reason = detectTypeScript7(getLibraryPathSetting());
  if (typeScript7Reason) {
    outputChannel.appendLine(
      `[Activation] ${typeScript7Reason} ` +
        `Glint requires TypeScript 5 or 6, so the Glint language server and tsserver plugin will not start. ` +
        `With TypeScript 7, template type-checking comes from a content mapper instead: add ` +
        `ember-content-mapper (https://github.com/NullVoxPopuli/ember-content-mapper) to "contentMappers" ` +
        `in tsconfig.json and run tsc with --runExternalCode.`,
    );
    registerTypeScript7LanguageStatus(context, outputChannel, getLibraryPathSetting());
    void registerContentMapperContribution(context, outputChannel);
    return;
  }

  prepareBuiltinTypeScriptExtension();

  const volarLabs = createLabsInfo(languageServerProtocol);
  const activeTextEditor = useActiveTextEditor();
  const visibleTextEditors = useVisibleTextEditors();
  let pendingRestart = false;
  let lastActivationReason: string | undefined;

  const emberTscStatus = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  emberTscStatus.command = SELECT_EMBER_TSC_COMMAND;
  context.subscriptions.push(emberTscStatus);

  const updateEmberTscStatus = (
    resolution?: EmberTscResolution,
  ): EmberTscResolution | undefined => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      emberTscStatus.hide();
      return resolution;
    }

    resolution ??= (() => {
      const emberTscSource = getEmberTscSourceSetting();
      const libraryPath = getLibraryPathSetting();
      return resolveEmberTscServerPath(workspaceFolder, emberTscSource, libraryPath);
    })();

    const label = resolution.path
      ? resolution.source === 'bundled'
        ? 'Bundled'
        : 'Workspace'
      : 'Missing';
    const fallback = resolution.usedFallback ? ' (fallback)' : '';
    emberTscStatus.text = `Ember TSC (${label}${fallback})`;
    emberTscStatus.tooltip =
      `Configured: ${resolution.configuredSource}\n` +
      `Resolved: ${resolution.path ?? 'Not found'}\n` +
      `Resolution dir: ${resolution.resolutionDir}`;
    emberTscStatus.show();

    return resolution;
  };

  const configureTsserverPlugin = async (): Promise<void> => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      return;
    }

    const emberTscSource = getEmberTscSourceSetting();
    const libraryPath = getLibraryPathSetting();
    const configuration = {
      emberTscSource,
      workspaceRoot: workspaceFolder.uri.fsPath,
      libraryPath,
    };

    try {
      await vscode.commands.executeCommand(
        'typescript.configurePlugin',
        TS_PLUGIN_NAME,
        configuration,
      );
    } catch (error) {
      outputChannel.appendLine(
        `typescript.configurePlugin not available; falling back to tsserver request. ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      await vscode.commands.executeCommand(
        'typescript.tsserverRequest',
        'configurePlugin',
        { pluginName: TS_PLUGIN_NAME, configuration },
        { isAsync: true, lowPriority: true },
      );
    }
  };

  const restartLanguageServer = async (): Promise<void> => {
    await executeCommand('typescript.restartTsServer');
    if (!client) {
      return;
    }

    if (client.state !== lsp.State.Running && client.state !== lsp.State.Starting) {
      if (!pendingRestart) {
        pendingRestart = true;
        setTimeout(() => {
          pendingRestart = false;
          void restartLanguageServer();
        }, 200);
      }
      return;
    }

    if (client.state === lsp.State.Starting) {
      const maybeOnReady = (client as { onReady?: () => Promise<void> }).onReady;
      if (maybeOnReady) {
        try {
          await maybeOnReady();
        } catch {
          return;
        }
      } else {
        return;
      }
    }

    if (client.state === lsp.State.Running) {
      await client.stop();
    }

    client.outputChannel.clear();
    await client.start();
  };

  const updateEmberTscState = async (restartServers: boolean): Promise<void> => {
    const resolution = updateEmberTscStatus();
    await configureTsserverPlugin();

    if (resolution?.usedFallback) {
      outputChannel.appendLine(
        `Workspace ember-tsc not found; using bundled ember-tsc from ${
          resolution.path ?? '(missing)'
        }`,
      );
    }

    if (restartServers) {
      await restartLanguageServer();
    }
  };

  void updateEmberTscState(false);

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (
        event.affectsConfiguration('glint2.libraryPath') ||
        event.affectsConfiguration(EMBER_TSC_SOURCE_SETTING)
      ) {
        void updateEmberTscState(true);
      }
    }),
  );

  const logActivationDecision = (reason: string): void => {
    if (reason !== lastActivationReason) {
      outputChannel.appendLine(`[Activation] ${reason}`);
      lastActivationReason = reason;
    }
  };

  const { stop } = watch(
    activeTextEditor,
    () => {
      // Only activate when we see a Glint-supported file type
      if (
        !visibleTextEditors.value.some((editor) => languageIds.includes(editor.document.languageId))
      ) {
        logActivationDecision('Waiting for a Glint-supported file to become visible.');
        return;
      }

      // Stop watching after we've activated once
      nextTick(() => stop());

      // Handle remote environment activation issues
      if (needRestart) {
        logActivationDecision(
          'Detected remote environment; activation requires extension host restart.',
        );
        vscode.window
          .showInformationMessage(
            'Please restart the extension host to activate Glint support in remote environments.',
            'Restart Extension Host',
            'Reload Window',
          )
          .then((action) => {
            if (action === 'Restart Extension Host') {
              vscode.commands.executeCommand('workbench.action.restartExtensionHost');
            } else if (action === 'Reload Window') {
              vscode.commands.executeCommand('workbench.action.reloadWindow');
            }
          });
        return;
      }

      logActivationDecision('Activating Glint language server (Glint file detected).');

      // Setup typescript.js in production mode (Vue does this for performance)
      if (fs.existsSync(path.join(__dirname, 'language-server.js'))) {
        fs.writeFileSync(
          path.join(__dirname, 'typescript.js'),
          `module.exports = require("${vscode.env.appRoot.replace(
            /\\/g,
            '/',
          )}/extensions/node_modules/typescript/lib/typescript.js");`,
        );
      }

      const launched = launch(context, outputChannel);
      if (launched) {
        client = launched.client;
        volarLabs.addLanguageClient(client);
        updateEmberTscStatus(launched.resolution);
      } else {
        logActivationDecision('Activation skipped: unable to resolve ember-tsc server.');
      }

      if (client) {
        activateAutoInsertion(languageIds, client);
        activateDocumentDropEdit(languageIds, client);
      }
    },
    { immediate: true },
  );

  useCommand('glint2.restart-language-server', restartLanguageServer);

  useCommand(SELECT_EMBER_TSC_COMMAND, async () => {
    const options: Array<{ label: string; description: string; value: EmberTscSource }> = [
      {
        label: 'Auto',
        description: 'Use workspace ember-tsc if available; otherwise use bundled.',
        value: 'auto',
      },
      {
        label: 'Workspace',
        description: 'Prefer the workspace ember-tsc (falls back to bundled if missing).',
        value: 'workspace',
      },
      {
        label: 'Bundled',
        description: 'Always use the ember-tsc bundled with the extension.',
        value: 'bundled',
      },
    ];

    const selected = await vscode.window.showQuickPick(options, {
      title: 'Select Ember TSC Source',
      placeHolder: 'Choose which ember-tsc Glint should use',
    });

    if (!selected) {
      return;
    }

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const target = workspaceFolder
      ? vscode.ConfigurationTarget.Workspace
      : vscode.ConfigurationTarget.Global;

    await vscode.workspace
      .getConfiguration()
      .update(EMBER_TSC_SOURCE_SETTING, selected.value, target);

    await updateEmberTscState(true);
  });

  onDeactivate(async () => {
    await client?.stop();
  });

  return volarLabs.extensionExports;
});

function launch(
  _context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel,
): { client: lsp.LanguageClient; resolution: EmberTscResolution } | undefined {
  // Try to find the language server in the workspace
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    outputChannel.appendLine('[Activation] No workspace folder available; not launching Glint.');
    return undefined;
  }

  const emberTscSource = getEmberTscSourceSetting();
  const libraryPath = getLibraryPathSetting();
  const resolution = resolveEmberTscServerPath(workspaceFolder, emberTscSource, libraryPath);

  if (!resolution.path) {
    outputChannel.appendLine(
      `Unable to resolve ember-tsc (source: ${resolution.configuredSource}) from ${resolution.resolutionDir} — not launching Glint.\n` +
        `If you're using bundled mode, please ensure the extension was properly built with pnpm build.\n` +
        `If Glint is installed in a child directory, you may wish to set the 'glint2.libraryPath' option ` +
        `in your workspace settings for the Glint VS Code extension.`,
    );
    return undefined;
  }

  if (resolution.usedFallback) {
    outputChannel.appendLine(
      `Workspace ember-tsc not found (source: ${resolution.configuredSource}); using bundled ember-tsc from ${resolution.path}`,
    );
  } else {
    outputChannel.appendLine(`Using ${resolution.source} ember-tsc from ${resolution.path}`);
  }

  const serverPath = resolution.path;

  const client = new lsp.LanguageClient(
    'glint',
    'Glint',
    {
      run: {
        module: serverPath,
        transport: lsp.TransportKind.ipc,
        options: {},
      },
      debug: {
        module: serverPath,
        transport: lsp.TransportKind.ipc,
        options: { execArgv: ['--nolazy', '--inspect=' + 6009] },
      },
    },
    {
      middleware: {
        ...middleware,
      },
      documentSelector: languageIds,
      markdown: {
        isTrusted: true,
        supportHtml: true,
      },
      outputChannel,
    },
  );

  // Handle tsserver requests by forwarding them to the VSCode TypeScript extension
  // This is a critical piece that allows Glint to leverage the built-in TS server
  // for things like auto-imports, refactoring, etc.
  client.onNotification('tsserver/request', async ([seq, command, args]) => {
    vscode.commands
      .executeCommand<
        { body: unknown } | undefined
      >('typescript.tsserverRequest', command, args, { isAsync: true, lowPriority: true })
      .then(
        (res) => {
          client.sendNotification('tsserver/response', [seq, res?.body]);
        },
        () => {
          client.sendNotification('tsserver/response', [seq, undefined]);
        },
      );
  });

  client.start();

  return { client, resolution };
}

interface EmberTscResolution {
  path?: string;
  source: EmberTscSource;
  configuredSource: EmberTscSource;
  usedFallback: boolean;
  resolutionDir: string;
}

function normalizeEmberTscSource(value: unknown): EmberTscSource {
  if (value === 'workspace' || value === 'bundled' || value === 'auto') {
    return value;
  }
  return 'auto';
}

function getLibraryPathSetting(): string {
  return vscode.workspace.getConfiguration().get('glint2.libraryPath', '.');
}

function getEmberTscSourceSetting(): EmberTscSource {
  const value = vscode.workspace.getConfiguration().get(EMBER_TSC_SOURCE_SETTING, 'auto');
  return normalizeEmberTscSource(value);
}

function resolveEmberTscServerPath(
  workspaceFolder: vscode.WorkspaceFolder,
  emberTscSource: EmberTscSource,
  libraryPath: string,
): EmberTscResolution {
  const resolutionDir = path.resolve(workspaceFolder.uri.fsPath, libraryPath);
  const workspacePath = resolveWorkspaceEmberTscServerPath(resolutionDir);
  const bundledPath = resolveBundledEmberTscServerPath();

  if (emberTscSource === 'bundled') {
    return {
      path: bundledPath,
      source: 'bundled',
      configuredSource: 'bundled',
      usedFallback: false,
      resolutionDir,
    };
  }

  if (workspacePath) {
    return {
      path: workspacePath,
      source: 'workspace',
      configuredSource: emberTscSource,
      usedFallback: false,
      resolutionDir,
    };
  }

  return {
    path: bundledPath,
    source: 'bundled',
    configuredSource: emberTscSource,
    usedFallback: true,
    resolutionDir,
  };
}

function resolveWorkspaceEmberTscServerPath(resolutionDir: string): string | undefined {
  try {
    const customRequire = createRequire(path.join(resolutionDir, 'package.json'));
    return customRequire.resolve('@glint/ember-tsc/bin/glint-language-server');
  } catch {
    return undefined;
  }
}

interface ContentMapperApi {
  registerContentMappers: (
    contributorId: string,
    contributions: ReadonlyArray<{ extensions: ReadonlyArray<string> }>,
  ) => vscode.Disposable;
}

const CONTENT_MAPPER_INSTALL_ADVICE =
  `Content mappers need a TypeScript 7 build newer than 2026-08-19. Until TypeScript 7.1 is released, ` +
  `install the TypeScript team's nightly TypeScript 7 extension; from TypeScript 7.1 on, the TypeScript 7 ` +
  `extension alone is enough.`;

function registerTypeScript7LanguageStatus(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel,
  libraryPath: string,
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(TYPESCRIPT_7_SHOW_MENU_COMMAND, () =>
      showTypeScript7Menu(outputChannel),
    ),
  );

  const status = vscode.languages.createLanguageStatusItem(
    'glint2.typescript7.status',
    languageIds,
  );
  status.name = 'TypeScript 7';
  status.text = 'TypeScript 7';
  void resolveTypeScript7Version(libraryPath).then((version) => {
    if (version) {
      status.text = `TypeScript ${version}`;
    }
  });
  status.detail = 'TypeScript Language Server';
  status.command = {
    title: 'Show Menu',
    command: TYPESCRIPT_7_SHOW_MENU_COMMAND,
  };

  context.subscriptions.push(status);

  const projectStatus = vscode.languages.createLanguageStatusItem(
    'glint2.typescript7.projectStatus',
    languageIds,
  );
  projectStatus.name = 'TypeScript 7 Project Status';
  projectStatus.detail = 'TypeScript Language Server';

  const updateProjectStatus = (): void => {
    const document = vscode.window.activeTextEditor?.document;
    if (!document || !languageIds.includes(document.languageId)) {
      return;
    }

    const configFile = findNearestTypeScriptConfig(document.uri);
    if (configFile) {
      projectStatus.text = vscode.workspace.asRelativePath(configFile);
      projectStatus.command = {
        title: 'Open Config File',
        command: 'vscode.open',
        arguments: [vscode.Uri.file(configFile)],
      };
    } else {
      projectStatus.text = document.languageId === 'glimmer-ts' ? 'No tsconfig' : 'No jsconfig';
      projectStatus.command = undefined;
    }
  };

  updateProjectStatus();
  context.subscriptions.push(
    projectStatus,
    vscode.window.onDidChangeActiveTextEditor(updateProjectStatus),
    vscode.workspace.onDidChangeWorkspaceFolders(updateProjectStatus),
  );
}

function findNearestTypeScriptConfig(resource: vscode.Uri): string | undefined {
  if (resource.scheme !== 'file') {
    return undefined;
  }

  const workspaceFolder = vscode.workspace.getWorkspaceFolder(resource);
  if (!workspaceFolder) {
    return undefined;
  }

  const workspaceRoot = workspaceFolder.uri.fsPath;
  let currentDirectory = path.dirname(resource.fsPath);

  while (isInDirectory(currentDirectory, workspaceRoot)) {
    for (const configFileName of ['tsconfig.json', 'jsconfig.json']) {
      const configFile = path.join(currentDirectory, configFileName);
      if (fs.existsSync(configFile)) {
        return configFile;
      }
    }

    const parentDirectory = path.dirname(currentDirectory);
    if (parentDirectory === currentDirectory) {
      break;
    }
    currentDirectory = parentDirectory;
  }

  return undefined;
}

function isInDirectory(pathToCheck: string, directory: string): boolean {
  const relativePath = path.relative(directory, pathToCheck);
  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

/**
 * TypeScript's native language server only tracks documents whose file
 * extensions an extension has registered with it, so without this call a
 * content-mapped `.gts` file never reaches the server and gets no hover,
 * completions, or diagnostics in the editor. Registering also lets the server
 * discover the project's tsconfig from a `.gts` file alone.
 */
async function registerContentMapperContribution(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel,
): Promise<void> {
  const owner = await findContentMapperApi();
  if (!owner) {
    outputChannel.appendLine(
      `[Activation] No installed extension exposes TypeScript's content mapper registration API. ` +
        `Glint will run the native TypeScript server for .gts and .gjs itself.`,
    );
    await startNativeTypeScriptClient(context, outputChannel);
    return;
  }

  try {
    const registration = owner.api.registerContentMappers(V2_EXTENSION_ID, [
      { extensions: ['.gts', '.gjs'] },
    ]);
    context.subscriptions.push(registration);
    outputChannel.appendLine(
      `[Activation] Registered .gts and .gjs with ${owner.id} for content mapper support. ` +
        CONTENT_MAPPER_INSTALL_ADVICE,
    );
  } catch (error) {
    outputChannel.appendLine(
      `[Activation] Registering .gts and .gjs with ${owner.id} failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

let nativeClient: lsp.LanguageClient | undefined;

/**
 * Runs the native TypeScript server for `.gts` and `.gjs` when no installed
 * extension can be asked to. This speaks the same protocol the TypeScript 7
 * extension's client does: `--lsp` over stdio, `runExternalCode` so the
 * server may run the content mapper from tsconfig, and one custom request
 * that names the extensions to serve. It uses the build the TypeScript 7
 * extension would prefer, so `.ts` and `.gts` files see the same version.
 */
async function startNativeTypeScriptClient(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel,
): Promise<void> {
  const host = preferredNativeTypeScriptHost();
  if (!host) {
    outputChannel.appendLine(
      `[Activation] No installed extension ships a native TypeScript build, so .gts and .gjs files ` +
        `will not get TypeScript 7 language features. ${CONTENT_MAPPER_INSTALL_ADVICE}`,
    );
    return;
  }

  const server: lsp.ServerOptions = {
    command: host.executable,
    args: ['--lsp'],
    transport: lsp.TransportKind.stdio,
  };
  const client = new lsp.LanguageClient('glint2-typescript7', 'TypeScript 7 (Glint)', server, {
    documentSelector: languageIds.map((language) => ({ scheme: 'file', language })),
    initializationOptions: { runExternalCode: true },
    outputChannel,
  });
  nativeClient = client;
  context.subscriptions.push(client);

  try {
    await client.start();
    await client.sendRequest('custom/setContentMapperContributions', {
      contributions: [{ extensions: ['.gts', '.gjs'] }],
      openDocuments: vscode.workspace.textDocuments
        .filter((document) => languageIds.includes(document.languageId))
        .map((document) => ({ uri: document.uri.toString() })),
    });
    outputChannel.appendLine(
      `[Activation] Started ${host.executable} for .gts and .gjs. ${CONTENT_MAPPER_INSTALL_ADVICE}`,
    );
  } catch (error) {
    outputChannel.appendLine(
      `[Activation] Starting ${host.executable} for .gts and .gjs failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

/**
 * The extension that exposes `registerContentMappers`, if any is installed.
 *
 * Which extension owns the API is not stable, and its id has changed before,
 * so no id is assumed. An already active extension that exports the API wins.
 * Otherwise every extension that looks like a TypeScript 7 host by its
 * manifest is activated and checked. The built-in TypeScript extension is
 * left alone: activating it spawns a tsserver that Glint stands down from.
 */
async function findContentMapperApi(): Promise<{ id: string; api: ContentMapperApi } | undefined> {
  for (const extension of vscode.extensions.all) {
    if (extension.isActive && hasContentMapperApi(extension.exports)) {
      return { id: extension.id, api: extension.exports };
    }
  }

  for (const extension of vscode.extensions.all) {
    if (extension.isActive || !looksLikeTypeScript7Extension(extension)) {
      continue;
    }

    try {
      const api: unknown = await extension.activate();
      if (hasContentMapperApi(api)) {
        return { id: extension.id, api };
      }
    } catch {
      // An extension that fails to activate cannot own the API.
    }
  }

  return undefined;
}

/**
 * Whether an extension's manifest marks it as a TypeScript 7 host. Extensions
 * that ship a native TypeScript build declare `bundledTypeScriptVersion`, and
 * the one that runs it contributes the `experimental.useTsgo` setting.
 */
function looksLikeTypeScript7Extension(extension: vscode.Extension<unknown>): boolean {
  const manifest = extension.packageJSON as {
    bundledTypeScriptVersion?: unknown;
    contributes?: { configuration?: unknown };
  };
  if (typeof manifest.bundledTypeScriptVersion === 'string') {
    return true;
  }

  const configuration = manifest.contributes?.configuration;
  const sections = Array.isArray(configuration) ? configuration : [configuration];
  return sections.some((section) => {
    const properties = (section as { properties?: Record<string, unknown> } | undefined)
      ?.properties;
    return (
      properties !== undefined &&
      Object.keys(properties).some((key) => key.endsWith('.experimental.useTsgo'))
    );
  });
}

function hasContentMapperApi(api: unknown): api is ContentMapperApi {
  return (
    typeof api === 'object' &&
    api !== null &&
    typeof (api as { registerContentMappers?: unknown }).registerContentMappers === 'function'
  );
}

/**
 * Opens the TypeScript 7 extension's menu from Glint's language status item.
 * That menu command is registered at runtime by whichever extension hosts
 * TypeScript 7, so it is looked up when clicked rather than assumed by id.
 */
async function showTypeScript7Menu(outputChannel: vscode.OutputChannel): Promise<void> {
  await findContentMapperApi();

  const commands = await vscode.commands.getCommands(true);
  const menuCommand = commands.find((command) => /^typescript\.(?:.+\.)?showMenu$/.test(command));
  if (menuCommand) {
    await vscode.commands.executeCommand(menuCommand);
    return;
  }

  const restart = 'Restart TypeScript 7 for .gts and .gjs';
  const showOutput = 'Show Glint Output';
  const selected = await vscode.window.showQuickPick(
    nativeClient ? [restart, showOutput] : [showOutput],
    { title: 'TypeScript 7 (Glint)' },
  );
  if (selected === restart) {
    await nativeClient?.restart();
  } else if (selected === showOutput) {
    outputChannel.show();
  }
}

/**
 * The TypeScript version the native language server runs, for the language
 * status item, or `undefined` when it cannot be determined.
 *
 * This mirrors how the TypeScript 7 extension picks its executable. A
 * `js/ts.tsdk.path` setting wins. Otherwise, extensions that ship a native
 * build under `lib/` are candidates, and one that only contributes a build
 * (no entry point, like the nightly) is run in preference to the bundled one.
 * Newer manifests declare the version as `bundledTypeScriptVersion`; older
 * ones do not, so the executable is asked. The workspace's typescript package
 * is the last resort.
 */
async function resolveTypeScript7Version(libraryPath: string): Promise<string | undefined> {
  const tsdkVersion = readTsdkPathVersion();
  if (tsdkVersion) {
    return tsdkVersion;
  }

  const preferred = preferredNativeTypeScriptHost();
  if (preferred) {
    return preferred.declaredVersion ?? (await readExecutableVersion(preferred.executable));
  }

  return detectWorkspaceTypeScriptVersion(libraryPath);
}

interface NativeTypeScriptHost {
  executable: string;
  declaredVersion?: string;
  buildOnly: boolean;
}

function preferredNativeTypeScriptHost(): NativeTypeScriptHost | undefined {
  const hosts = findNativeTypeScriptHosts();
  return hosts.find((host) => host.buildOnly) ?? hosts[0];
}

function findNativeTypeScriptHosts(): NativeTypeScriptHost[] {
  const suffix = process.platform === 'win32' ? '.exe' : '';
  const hosts: NativeTypeScriptHost[] = [];
  for (const extension of vscode.extensions.all) {
    for (const baseName of ['tsgo', 'tsc']) {
      const executable = path.join(extension.extensionPath, 'lib', baseName + suffix);
      if (!fs.existsSync(executable)) {
        continue;
      }
      const manifest = extension.packageJSON as {
        main?: unknown;
        bundledTypeScriptVersion?: unknown;
      };
      hosts.push({
        executable,
        declaredVersion:
          typeof manifest.bundledTypeScriptVersion === 'string'
            ? manifest.bundledTypeScriptVersion
            : undefined,
        buildOnly: manifest.main === undefined,
      });
      break;
    }
  }
  return hosts;
}

function readExecutableVersion(executable: string): Promise<string | undefined> {
  return new Promise((resolve) => {
    execFile(executable, ['--version'], { timeout: 5_000 }, (error, stdout) => {
      const match = error ? undefined : /\d+\.\d+\.\d+\S*/.exec(stdout);
      resolve(match?.[0]);
    });
  });
}

const TSDK_PATH_SETTINGS = ['js/ts.tsdk.path', 'typescript.native-preview.tsdk'];

/**
 * The version of a TypeScript package the user pointed the native server at
 * through a tsdk path setting. The setting may name the package directory or
 * its `lib` directory, so the package manifest is looked for in both.
 */
function readTsdkPathVersion(): string | undefined {
  const configuration = vscode.workspace.getConfiguration();
  for (const setting of TSDK_PATH_SETTINGS) {
    const value = configuration.get<string>(setting);
    if (!value) {
      continue;
    }

    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    const tsdkPath =
      path.isAbsolute(value) || !workspaceRoot ? value : path.resolve(workspaceRoot, value);
    for (const directory of [tsdkPath, path.dirname(tsdkPath)]) {
      try {
        const manifest = JSON.parse(
          fs.readFileSync(path.join(directory, 'package.json'), 'utf8'),
        ) as { version?: unknown };
        if (typeof manifest.version === 'string') {
          return manifest.version;
        }
      } catch {
        // Not a package directory; try the parent.
      }
    }
  }

  return undefined;
}

/**
 * Why Glint must stand down for TypeScript 7, or `undefined` when it must run.
 *
 * TypeScript 7 is in play in either of two situations. The user turned on the
 * native preview in VS Code. That replaces the built-in tsserver that Glint
 * hooks into, whatever `typescript` package the workspace installs. Or the
 * workspace installs the TypeScript 7 package, whose JS API Glint cannot load.
 */
function detectTypeScript7(libraryPath: string): string | undefined {
  const useTsgo = getUseTsgoSetting();
  if (useTsgo) {
    return `TypeScript 7 is enabled in VS Code via "${useTsgo}".`;
  }

  const workspaceTypeScriptVersion = detectWorkspaceTypeScriptVersion(libraryPath);
  if (workspaceTypeScriptVersion && parseInt(workspaceTypeScriptVersion, 10) >= 7) {
    return `TypeScript ${workspaceTypeScriptVersion} is installed in this workspace.`;
  }

  return undefined;
}

const USE_TSGO_SETTINGS = ['js/ts.experimental.useTsgo', 'typescript.experimental.useTsgo'];
const CONFIGURATION_SCOPES = ['workspaceFolderValue', 'workspaceValue', 'globalValue'] as const;

/**
 * The name of the setting that turns on TypeScript 7 in VS Code, or
 * `undefined` when TypeScript 7 is off. The native preview extension only
 * honors explicitly set values, lets the most specific scope win, and prefers
 * the `js/ts` name over the deprecated `typescript` name within a scope. This
 * resolves the two names the same way so Glint and the native preview agree.
 */
function getUseTsgoSetting(): string | undefined {
  const configuration = vscode.workspace.getConfiguration();
  const inspections = USE_TSGO_SETTINGS.map((setting) => ({
    setting,
    inspection: configuration.inspect<boolean>(setting),
  }));

  for (const scope of CONFIGURATION_SCOPES) {
    for (const { setting, inspection } of inspections) {
      const value = inspection?.[scope];
      if (value !== undefined) {
        return value ? setting : undefined;
      }
    }
  }

  return undefined;
}

/**
 * The version of the `typescript` package installed in the workspace, or
 * `undefined` when there is no workspace folder or no resolvable typescript.
 * Both the TypeScript 5/6 and 7 packages export their package.json, so this
 * resolves across every version Glint might encounter.
 */
function detectWorkspaceTypeScriptVersion(libraryPath: string): string | undefined {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    return undefined;
  }

  try {
    const resolutionDir = path.resolve(workspaceFolder.uri.fsPath, libraryPath);
    const customRequire = createRequire(path.join(resolutionDir, 'package.json'));
    const manifest = customRequire('typescript/package.json') as { version?: unknown };
    return typeof manifest.version === 'string' ? manifest.version : undefined;
  } catch {
    return undefined;
  }
}

function resolveBundledEmberTscServerPath(): string | undefined {
  try {
    const glintExtension = vscode.extensions.getExtension('typed-ember.glint2-vscode');
    if (!glintExtension) {
      return undefined;
    }

    const bundledPath = path.join(
      glintExtension.extensionPath,
      'node_modules/glint-ember-tsc-pack/bin/glint-language-server.js',
    );

    return fs.existsSync(bundledPath) ? bundledPath : undefined;
  } catch (error) {
    return undefined;
  }
}

/**
 * Hooks Glint into the built-in VS Code TypeScript extension
 * (vscode.typescript-language-features). Glint's language features ride on
 * that extension's tsserver, so it must be activated even though it is not
 * configured to activate for .gts files:
 * https://github.com/microsoft/vscode/blob/878af07/extensions/typescript-language-features/package.json#L62..L75
 *
 * Before activating it, its bundle is monkeypatched so that features like Find
 * File References and Go to Source Definition treat .gts/.gjs as TypeScript.
 * The patch must be in place before the bundle is read, so it comes first.
 */
function prepareBuiltinTypeScriptExtension(): void {
  const tsExtension = vscode.extensions.getExtension('vscode.typescript-language-features');
  if (!tsExtension) {
    return;
  }

  patchBuiltinTypeScriptExtension(tsExtension);

  const activationPromise = tsExtension.activate();
  if (activationPromise && typeof activationPromise.then === 'function') {
    activationPromise.then(
      () => {
        // TypeScript extension has been activated
      },
      () => {
        vscode.window
          .showWarningMessage(
            'Glint requires the "TypeScript and JavaScript Language Features" extension to be enabled.',
            'Show Extension',
          )
          .then((selected) => {
            if (selected) {
              executeCommand(
                'workbench.extensions.search',
                '@builtin typescript-language-features',
              );
            }
          });
      },
    );
  }
}

// The code below contains hacks lifted from the Vue extension to monkeypatch
// portions of official VSCode TS extension (vscode.typescript-language-features)
// to add some missing features that make the tooling more seamless.
//
// Note that these hacks should ABSOLUTELY be upstreamed to VSCode but it is unclear
// whether our efforts will be successful.
//
// https://github.com/vuejs/language-tools/blob/master/extensions/vscode/src/nodeClientMain.ts#L135-L195
//
// It is important for us (for the time being) to manually follow along with changes made to the
// Vue extension within the above file. Ideally Volar should extract this logic into a shared library.
//
// Specifically these hacks make things like Find File References, Go to Source Definition, etc.
// work in .gts files.
//
// https://github.com/search?q=repo%3Amicrosoft%2Fvscode%20isSupportedLanguageMode&type=code
function patchBuiltinTypeScriptExtension(tsExtension: vscode.Extension<unknown>): void {
  try {
    const fs = require('node:fs');
    const readFileSync = fs.readFileSync;
    const extensionJsPath = require.resolve('./dist/extension.js', {
      paths: [tsExtension.extensionPath],
    });

    // @ts-expect-error – not easy to type
    fs.readFileSync = (...args) => {
      if (args[0] === extensionJsPath) {
        let text = readFileSync(...args) as string;

        const concatLanguageIds = `.concat(${languageIds.map((lang) => `'${lang}'`).join(',')})`;

        // patch jsTsLanguageModes - this makes VSCode recognize our custom language IDs
        // as valid TypeScript-like languages for features like refactoring.
        //
        // VSCode 1.110 minified this differently: the array is no longer assigned to a
        // `jsTsLanguageModes` property but to a local var preceded by the `"javascriptreact"`
        // literal, e.g. `"javascriptreact",kh=[Ya,Va,Cl,Rs]`. Match either form (the
        // identifiers are minified and change between releases) and append `.concat(...)`
        // to the language-mode array. (See vuejs/language-tools for the same approach.)
        text = text.replace(
          /t\.jsTsLanguageModes=\[t\.javascript,t\.javascriptreact,t\.typescript,t\.typescriptreact\]|"javascriptreact",[\w$]+=\[[\w$]+,[\w$]+,[\w$]+,[\w$]+\]/,
          (s) => s + concatLanguageIds,
        );

        // patch isSupportedLanguageMode - this enables features like "Find All References"
        // and "Go to Definition" to work across .gts/.gjs files. Pre-1.110 the args were
        // `t.typescript,...`; 1.110+ uses minified identifiers, e.g. `[Cl,Rs,Ya,Va]`.
        text = text.replace(
          /\.languages\.match\(\[(?:t\.typescript,t\.typescriptreact,t\.javascript,t\.javascriptreact|[\w$]+,[\w$]+,[\w$]+,[\w$]+)\]/,
          (s) => s + concatLanguageIds,
        );

        // Sort plugins to prioritize glint plugin (for compatibility with other TS plugins).
        // Both pre-1.110 (`"--globalPlugins",i.plugins`) and 1.110+
        // (`"--globalPlugins",o.plugins.map(m=>m.name).join(",")`) start with
        // `"--globalPlugins",<ident>.plugins`; inserting `.slice().sort(...)` there works
        // for both — the array is sorted before it is either passed through or mapped.
        const glintPluginName = '@glint/tsserver-plugin-pack';
        text = text.replace(
          /"--globalPlugins",[\w$]+\.plugins/,
          (s) =>
            s +
            `.slice().sort((a,b)=>(b.name==="${glintPluginName}"?-1:0)-(a.name==="${glintPluginName}"?-1:0))`,
        );

        return text;
      }
      return readFileSync(...args);
    };

    // Handle the case where the VSCode TS extension was already loaded prior
    // to our readFileSync hacks above, in which case we restart the extension host
    // so that the TS extension is reloaded with our hacks in place.
    //
    // https://github.com/vuejs/language-tools/pull/5260
    const loadedModule = require.cache[extensionJsPath];
    if (loadedModule) {
      delete require.cache[extensionJsPath];
      const patchedModule = require(extensionJsPath);
      Object.assign(loadedModule.exports, patchedModule);
    }

    if (tsExtension.isActive) {
      if (!vscode.env.remoteName) {
        vscode.commands.executeCommand('workbench.action.restartExtensionHost');
      } else {
        needRestart = true;
      }
    }
  } catch (e) {
    // Silently fail if patching doesn't work - the extension will still function
    // but some features like cross-file references might not work as expected

    console.error(e);
  }
}
