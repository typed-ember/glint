import { ExtensionContext, workspace } from 'vscode';
import { LanguageClient, LanguageClientOptions } from 'vscode-languageclient/node';

module.exports = {
  activate(context: ExtensionContext) {
    const executable = {
      command: 'node_modules/.bin/glint-language-server',
    };

    const serverOptions = {
      run: executable,
      debug: executable,
    };

    const clientOptions: LanguageClientOptions = {
      documentSelector: [
        {
          scheme: 'file',
          language: 'handlebars',
        },
        {
          scheme: 'file',
          language: 'typescript',
        },
      ],
      synchronize: {
        fileEvents: workspace.createFileSystemWatcher('**/*.{ts,hbs}'),
      },
    };

    const client = new LanguageClient('glint', 'Glint', serverOptions, clientOptions);

    context.subscriptions.push(client.start());
  },
};
