import {
  activateAutoInsertion,
  activateDocumentDropEdit,
  createLabsInfo,
  middleware,
} from '@volar/vscode';
import * as languageServerProtocol from '@volar/language-server/protocol.js';
import * as lsp from '@volar/vscode/node';
import * as fs from 'node:fs';
import * as path from 'node:path';
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
import { config } from './config';

let client: lsp.BaseLanguageClient | undefined;
let needRestart = false;

const languageIds = ['glimmer-js', 'glimmer-ts'];

export const { activate, deactivate } = defineExtension(() => {
  const context = extensionContext.value!;
  const volarLabs = createLabsInfo(languageServerProtocol);
  const activeTextEditor = useActiveTextEditor();
  const visibleTextEditors = useVisibleTextEditors();

  const { stop } = watch(
    activeTextEditor,
    () => {
      // Only activate when we see a Glint-supported file type
      if (
        !visibleTextEditors.value.some((editor) =>
          languageIds.includes(editor.document.languageId),
        )
      ) {
        return;
      }

      // Stop watching after we've activated once
      nextTick(() => stop());

      // Handle remote environment activation issues
      if (needRestart) {
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

      const launchedClient = launch(context);
      if (launchedClient) {
        client = launchedClient;
        volarLabs.addLanguageClient(client);
      }

      if (client) {
        activateAutoInsertion(languageIds, client);
        activateDocumentDropEdit(languageIds, client);
      }
    },
    { immediate: true },
  );

  useCommand('glint.restart-language-server', async () => {
    await executeCommand('typescript.restartTsServer');
    await client?.stop();
    client?.outputChannel.clear();
    await client?.start();
  });

  onDeactivate(async () => {
    await client?.stop();
  });

  return volarLabs.extensionExports;
});

function launch(_context: vscode.ExtensionContext): lsp.LanguageClient | undefined {
  // Try to find the language server in the workspace
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    return undefined;
  }

  const outputChannel = useOutputChannel('Glint Language Server');

  let userLibraryPath = vscode.workspace.getConfiguration().get('glint.libraryPath', '.');
  let resolutionDir = path.resolve(workspaceFolder.uri.fsPath, userLibraryPath);
  let serverPath: string;

  try {
    const { createRequire } = require('node:module') as typeof import('node:module');
    const customRequire = createRequire(path.join(resolutionDir, 'package.json'));
    serverPath = customRequire.resolve('@glint/core/bin/glint-language-server');
  } catch {
    // Many workspaces with `tsconfig` files won't be Glint projects, so it's totally fine for us to
    // just bail out if we don't see `@glint/core`. If someone IS expecting Glint to run for this
    // project, though, we leave a message in our channel explaining why we didn't launch.
    outputChannel.appendLine(
      `Unable to resolve @glint/core from ${resolutionDir} — not launching Glint.\n` +
        `If Glint is installed in a child directory, you may wish to set the 'glint.libraryPath' option ` +
        `in your workspace settings for the Glint VS Code extension.`,
    );
    return undefined;
  }

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

  return client;
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
        (s) =>
          s + `.concat(${languageIds.map((lang) => `'${lang}'`).join(',')})`,
      );

      // patch isSupportedLanguageMode - this enables features like "Find All References"
      // and "Go to Definition" to work across .gts/.gjs files
      text = text.replace(
        '.languages.match([t.typescript,t.typescriptreact,t.javascript,t.javascriptreact]',
        (s) =>
          s + `.concat(${languageIds.map((lang) => `'${lang}'`).join(',')})`,
      );

      // Sort plugins to prioritize glint plugin (for compatibility with other TS plugins)
      const glintPluginName = 'glint-tsserver-plugin-pack';
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
