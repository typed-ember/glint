import { ExtensionContext } from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';

module.exports = {
  activate(context: ExtensionContext) {
    const executable = {
      command: 'node_modules/.bin/glint-language-server',
    };

    const serverOptions = {
      run: executable,
      debug: executable,
    };

    const clientOptions = {
      documentSelector: [
        {
          scheme: 'file',
          language: 'handlebars',
        },
      ],
    };

    const client = new LanguageClient('glint-extension-id', 'Glint', serverOptions, clientOptions);

    context.subscriptions.push(client.start());
  },
};
