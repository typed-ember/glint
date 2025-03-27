import { createRequire } from 'node:module';
import * as path from 'node:path';
import * as lsp from '@volar/vscode/node';
import * as fs from 'node:fs';
import * as vscode from 'vscode';
import * as languageServerProtocol from '@volar/language-server/protocol.js';
import { createLabsInfo } from '@volar/vscode';
import { config } from './config';

import {
  defineExtension,
  extensionContext,
  onDeactivate,
  useWorkspaceFolders,
  watch,
} from 'reactive-vscode';

import { watchWorkspaceFolderForLanguageClientActivation } from './language-client';
import { ExtensionContext } from 'vscode';

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

  const clients = new Map<string, lsp.LanguageClient>();

  const reactiveWorkspaceFolders = useWorkspaceFolders();

  let oldWorkspaceFolders: readonly vscode.WorkspaceFolder[] | undefined;

  // NOTE: I tried to use the `watch` callback API to provide the old and new values
  // for workspace folders but for some reason they kept coming in as undefined
  // so I'm tracking new and old values menually.
  watch(
    reactiveWorkspaceFolders,
    () => {
      const newWorkspaceFolders = reactiveWorkspaceFolders.value;

      // TODO: handle removed folders.
      const removedFolders =
        oldWorkspaceFolders?.filter(
          (oldFolder) =>
            !newWorkspaceFolders?.some(
              (newFolder) => newFolder.uri.fsPath === oldFolder.uri.fsPath,
            ),
        ) ?? [];
      const addedFolders =
        newWorkspaceFolders?.filter(
          (newFolder) =>
            !oldWorkspaceFolders?.some(
              (oldFolder) => oldFolder.uri.fsPath === newFolder.uri.fsPath,
            ),
        ) ?? [];

      oldWorkspaceFolders = newWorkspaceFolders;

      addedFolders.forEach((workspaceFolder) => {
        const teardownClient = watchWorkspaceFolderForLanguageClientActivation(
          context,
          workspaceFolder,
          (id, name, documentSelector, initOptions, port, outputChannel) => {
            class _LanguageClient extends lsp.LanguageClient {
              override fillInitializeParams(params: lsp.InitializeParams): void {
                // fix https://github.com/vuejs/language-tools/issues/1959
                params.locale = vscode.env.language;
              }
            }

            let folderPath = workspaceFolder.uri.fsPath;
            if (clients.has(folderPath)) return null;

            let serverPath = findLanguageServer(folderPath, outputChannel);
            if (!serverPath) return null;

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

            return client;
          },
        );

        onDeactivate(() => {
          teardownClient();
        });
      });
    },
    {
      immediate: true, // causes above callback to be run immediately (i.e. not lazily)
    },
  );

  return volarLabs.extensionExports;
});

function updateProviders(client: lsp.LanguageClient): void {
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

function findLanguageServer(
  workspaceDir: string,
  outputChannel: vscode.OutputChannel,
): string | null {
  let userLibraryPath = vscode.workspace.getConfiguration().get('glint.libraryPath', '.');
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
const tsExtension = vscode.extensions.getExtension('vscode.typescript-language-features')!;
const readFileSync = fs.readFileSync;
const extensionJsPath = require.resolve('./dist/extension.js', {
  paths: [tsExtension.extensionPath],
});

const languageIdsQuoted = config.server.includeLanguages.map((lang) => `'${lang}'`).join(',');

// TODO: as of March 23 2025 and perhaps a few days before, this fs.readFileSync hacky
// is failing with "Cannot set property readFileSync of #<Object> which has only a getter".
// Stay tuned for another hack from Volar... or hopefully an upstream fix from VSCode.

// @ts-expect-error – not easy to type
fs.readFileSync = (...args) => {
  if (args[0] === extensionJsPath) {
    // @ts-expect-error – not easy to type
    let text = readFileSync(...args) as string;

    // patch readPlugins so that it initializes our plugin with the language IDs specified
    // in the VSCode config (e.g. `glint.server.includeLanguages`), rather than the language IDs
    // specified in the Glint VSCode extension package.json `typescriptServerPlugins` payload.
    //
    // TODO: do we actually need this configure-ability or would it suffice to just use
    // a hardcoded array of ['glimmer-js', 'glimmer-ts', 'handlebars']? If so, need to update
    // the Glint VSCode extension package.json `typescriptServerPlugins` payload to include
    // handlebars.
    //
    // https://github.com/microsoft/vscode/blob/6900113cf934d3d379757534d6f57929c5eb87f2/extensions/typescript-language-features/src/tsServer/plugins.ts#L81
    //
    // Note: we use the esbuild-packaged name `glint-tsserver-plugin-pack` rather than the NPM
    // module name `@glint/tsserver-plugin` because the latter is not installed in the VSCode
    // extension's `node_modules` folder.
    const typeScriptServerPluginName = 'glint-tsserver-plugin-pack';
    text = text.replace(
      'languages:Array.isArray(e.languages)',
      [
        'languages:',
        `e.name==='${typeScriptServerPluginName}'?[${languageIdsQuoted}]`,
        ':Array.isArray(e.languages)',
      ].join(''),
    );

    // Expose tsserver process in SingleTsServer constructor
    text = text.replace(
      ',this._callbacks.destroy("server errored")}))',
      (s) => s + ',globalThis.__TSSERVER__||={},globalThis.__TSSERVER__[arguments[1]]=this',
    );

    /**
     * VSCode < 1.87.0
     */

    text = text.replace('t.$u=[t.$r,t.$s,t.$p,t.$q]', (s) => s + `.concat(${languageIdsQuoted})`); // patch jsTsLanguageModes
    text = text.replace(
      '.languages.match([t.$p,t.$q,t.$r,t.$s]',
      (s) => s + `.concat(${languageIdsQuoted})`,
    ); // patch isSupportedLanguageMode

    /**
     * VSCode >= 1.87.0
     *
     * https://github.com/microsoft/vscode/blob/7e4e3c373200b0b1564da09d1af0279a0cde8caf/extensions/typescript-language-features/src/configuration/languageIds.ts#L14-L19
     */

    text = text.replace(
      't.jsTsLanguageModes=[t.javascript,t.javascriptreact,t.typescript,t.typescriptreact]',
      (s) => s + `.concat(${languageIdsQuoted})`,
    ); // patch jsTsLanguageModes
    text = text.replace(
      '.languages.match([t.typescript,t.typescriptreact,t.javascript,t.javascriptreact]',
      (s) => s + `.concat(${languageIdsQuoted})`,
    ); // patch isSupportedLanguageMode

    return text;
  }
  // @ts-expect-error – not easy to type
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
  vscode.commands.executeCommand('workbench.action.restartExtensionHost');
}
