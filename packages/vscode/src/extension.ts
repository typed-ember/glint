import * as languageServerProtocol from '@volar/language-server/protocol.js';
import {
  activateAutoInsertion,
  activateDocumentDropEdit,
  createLabsInfo,
  middleware,
} from '@volar/vscode';
import * as lsp from '@volar/vscode/node';
import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  resolveEmberTscServerPath as resolveEmberTscServerPathPure,
  type EmberTscSource,
  type ResolveEmberTscResult,
} from './resolve-ember-tsc';
import {
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
} from 'reactive-vscode';
import * as vscode from 'vscode';

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

export const { activate, deactivate } = defineExtension(() => {
  if (v1ExtensionPresent) {
    return;
  }

  const context = extensionContext.value!;
  const volarLabs = createLabsInfo(languageServerProtocol);
  const activeTextEditor = useActiveTextEditor();
  const visibleTextEditors = useVisibleTextEditors();
  const outputChannel = useOutputChannel('Glint2 Language Server');
  let pendingRestart = false;
  let lastActivationReason: string | undefined;

  const emberTscStatus = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  emberTscStatus.command = SELECT_EMBER_TSC_COMMAND;
  context.subscriptions.push(emberTscStatus);

  const updateEmberTscStatus = (
    resolution?: EmberTscResolution,
  ): EmberTscResolution | undefined => {
    const activeFile = getActiveGlintFileUri();
    const workspaceFolder = getWorkspaceFolderForActiveFile(activeFile);
    if (!workspaceFolder) {
      emberTscStatus.hide();
      return resolution;
    }

    resolution ??= resolveEmberTscServerPath(
      workspaceFolder,
      getEmberTscSourceSetting(workspaceFolder),
      getLibraryPathSetting(workspaceFolder),
      activeFile,
    );

    const label = resolution.path
      ? resolution.source === 'bundled'
        ? 'Bundled'
        : 'Workspace'
      : 'Missing';
    const fallback = resolution.usedFallback ? ' (fallback)' : '';
    const auto = resolution.autoDiscovered ? ' (auto)' : '';
    emberTscStatus.text = `Ember TSC (${label}${fallback}${auto})`;
    emberTscStatus.tooltip =
      `Configured: ${resolution.configuredSource}\n` +
      `Resolved: ${resolution.path ?? 'Not found'}\n` +
      `Resolution dir: ${resolution.resolutionDir}` +
      (resolution.autoDiscovered ? '\nAuto-discovered from active document.' : '');
    emberTscStatus.show();

    return resolution;
  };

  const configureTsserverPlugin = async (): Promise<void> => {
    const activeFile = getActiveGlintFileUri();
    const workspaceFolder = getWorkspaceFolderForActiveFile(activeFile);
    if (!workspaceFolder) {
      return;
    }

    const emberTscSource = getEmberTscSourceSetting(workspaceFolder);
    const libraryPath = getLibraryPathSetting(workspaceFolder);
    const resolution = resolveEmberTscServerPath(
      workspaceFolder,
      emberTscSource,
      libraryPath,
      activeFile,
    );
    // Hand the TS plugin the same resolution dir so it sees the same
    // `@glint/ember-tsc` install we picked for the language server.
    const effectiveLibraryPath =
      path.relative(workspaceFolder.uri.fsPath, resolution.resolutionDir) || '.';
    const configuration = {
      emberTscSource,
      workspaceRoot: workspaceFolder.uri.fsPath,
      libraryPath: effectiveLibraryPath,
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

    const activeFile = getActiveGlintFileUri();
    const workspaceFolder = getWorkspaceFolderForActiveFile(activeFile);
    const target = workspaceFolder
      ? vscode.ConfigurationTarget.WorkspaceFolder
      : vscode.ConfigurationTarget.Global;

    await vscode.workspace
      .getConfiguration(undefined, workspaceFolder)
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
  // Try to find the language server based on the active document.
  const activeFile = getActiveGlintFileUri();
  const workspaceFolder = getWorkspaceFolderForActiveFile(activeFile);
  if (!workspaceFolder) {
    outputChannel.appendLine('[Activation] No workspace folder available; not launching Glint.');
    return undefined;
  }

  const emberTscSource = getEmberTscSourceSetting(workspaceFolder);
  const libraryPath = getLibraryPathSetting(workspaceFolder);
  const resolution = resolveEmberTscServerPath(
    workspaceFolder,
    emberTscSource,
    libraryPath,
    activeFile,
  );

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

type EmberTscResolution = ResolveEmberTscResult;

function normalizeEmberTscSource(value: unknown): EmberTscSource {
  if (value === 'workspace' || value === 'bundled' || value === 'auto') {
    return value;
  }
  return 'auto';
}

function getLibraryPathSetting(scope?: vscode.WorkspaceFolder | vscode.Uri): string {
  return vscode.workspace.getConfiguration(undefined, scope).get('glint2.libraryPath', '.');
}

function getEmberTscSourceSetting(scope?: vscode.WorkspaceFolder | vscode.Uri): EmberTscSource {
  const value = vscode.workspace
    .getConfiguration(undefined, scope)
    .get(EMBER_TSC_SOURCE_SETTING, 'auto');
  return normalizeEmberTscSource(value);
}

function getActiveGlintFileUri(): vscode.Uri | undefined {
  const active = vscode.window.activeTextEditor;
  if (active && languageIds.includes(active.document.languageId)) {
    return active.document.uri;
  }
  const visible = vscode.window.visibleTextEditors.find((editor) =>
    languageIds.includes(editor.document.languageId),
  );
  return visible?.document.uri;
}

function getWorkspaceFolderForActiveFile(
  activeFile: vscode.Uri | undefined,
): vscode.WorkspaceFolder | undefined {
  if (activeFile) {
    const folder = vscode.workspace.getWorkspaceFolder(activeFile);
    if (folder) {
      return folder;
    }
  }
  return vscode.workspace.workspaceFolders?.[0];
}

function resolveEmberTscServerPath(
  workspaceFolder: vscode.WorkspaceFolder,
  emberTscSource: EmberTscSource,
  libraryPath: string,
  activeFile: vscode.Uri | undefined,
): EmberTscResolution {
  return resolveEmberTscServerPathPure({
    workspaceRoot: workspaceFolder.uri.fsPath,
    libraryPath,
    emberTscSource,
    activeFileFsPath: activeFile && activeFile.scheme === 'file' ? activeFile.fsPath : undefined,
    bundledServerPath: resolveBundledEmberTscServerPath(),
  });
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

// We need to activate the default VSCode TypeScript extension so that our
// TS Plugin kicks in. We do this because the TS extension is (obviously) not
// configured to activate for, say, .gts files:
// https://github.com/microsoft/vscode/blob/878af07/extensions/typescript-language-features/package.json#L62..L75
const tsExtension = vscode.extensions.getExtension('vscode.typescript-language-features');

if (tsExtension) {
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

if (!v1ExtensionPresent) {
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
  try {
    const fs = require('node:fs');
    const tsExtension = vscode.extensions.getExtension('vscode.typescript-language-features')!;
    const readFileSync = fs.readFileSync;
    const extensionJsPath = require.resolve('./dist/extension.js', {
      paths: [tsExtension.extensionPath],
    });

    // @ts-expect-error – not easy to type
    fs.readFileSync = (...args) => {
      if (args[0] === extensionJsPath) {
        let text = readFileSync(...args) as string;

        // patch jsTsLanguageModes - this makes VSCode recognize our custom language IDs
        // as valid TypeScript-like languages for features like refactoring
        text = text.replace(
          't.jsTsLanguageModes=[t.javascript,t.javascriptreact,t.typescript,t.typescriptreact]',
          (s) => s + `.concat(${languageIds.map((lang) => `'${lang}'`).join(',')})`,
        );

        // patch isSupportedLanguageMode - this enables features like "Find All References"
        // and "Go to Definition" to work across .gts/.gjs files
        text = text.replace(
          '.languages.match([t.typescript,t.typescriptreact,t.javascript,t.javascriptreact]',
          (s) => s + `.concat(${languageIds.map((lang) => `'${lang}'`).join(',')})`,
        );

        // Sort plugins to prioritize glint plugin (for compatibility with other TS plugins)
        const glintPluginName = '@glint/tsserver-plugin-pack';
        text = text.replace(
          '"--globalPlugins",i.plugins',
          (s) =>
            s +
            `.sort((a,b)=>(b.name==="${glintPluginName}"?-1:0)-(a.name==="${glintPluginName}"?-1:0))`,
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
