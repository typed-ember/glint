import {
  Connection,
  ServerCapabilities,
  TextDocuments,
  TextDocumentSyncKind,
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import GlintLanguageServer from './glint-language-server';
import { debounce } from '../common/scheduling';

export const capabilities: ServerCapabilities = {
  textDocumentSync: TextDocumentSyncKind.Full,
  completionProvider: {
    resolveProvider: true,
  },
  referencesProvider: true,
  hoverProvider: true,
  definitionProvider: true,
  workspaceSymbolProvider: true,
  renameProvider: {
    prepareProvider: true,
  },
};

export type BindingArgs = {
  languageServer: GlintLanguageServer;
  openDocuments: TextDocuments<TextDocument>;
  connection: Connection;
};

export function bindLanguageServer(args: BindingArgs): void {
  let { connection, languageServer, openDocuments } = args;
  let { scheduleDiagnostics, captureErrors } = buildHelpers(args);

  connection.onInitialize(() => ({ capabilities }));

  openDocuments.onDidOpen(({ document }) => {
    languageServer.openFile(document.uri, document.getText());
    scheduleDiagnostics();
  });

  openDocuments.onDidClose(({ document }) => {
    languageServer.closeFile(document.uri);
  });

  openDocuments.onDidChangeContent(({ document }) => {
    languageServer.updateFile(document.uri, document.getText());
    scheduleDiagnostics();
  });

  connection.onPrepareRename(({ textDocument, position }) => {
    return captureErrors(() => languageServer.prepareRename(textDocument.uri, position));
  });

  connection.onRenameRequest(({ textDocument, position, newName }) => {
    return captureErrors(() =>
      languageServer.getEditsForRename(textDocument.uri, position, newName)
    );
  });

  connection.onCompletion(({ textDocument, position }) => {
    return captureErrors(() => languageServer.getCompletions(textDocument.uri, position));
  });

  connection.onCompletionResolve((item) => {
    return captureErrors(() => languageServer.getCompletionDetails(item)) ?? item;
  });

  connection.onHover(({ textDocument, position }) => {
    return captureErrors(() => languageServer.getHover(textDocument.uri, position));
  });

  connection.onDefinition(({ textDocument, position }) => {
    return captureErrors(() => languageServer.getDefinition(textDocument.uri, position));
  });

  connection.onReferences(({ textDocument, position }) => {
    return captureErrors(() => languageServer.getReferences(textDocument.uri, position));
  });

  connection.onWorkspaceSymbol(({ query }) => {
    return captureErrors(() => languageServer.findSymbols(query));
  });

  connection.onDidChangeWatchedFiles(({ changes }) => {
    for (let change of changes) {
      languageServer.fileDidChange(change.uri);
    }

    scheduleDiagnostics();
  });
}

type BindingHelpers = {
  scheduleDiagnostics: () => void;
  captureErrors: <T>(callback: () => T) => T | undefined;
};

function buildHelpers({ languageServer, openDocuments, connection }: BindingArgs): BindingHelpers {
  return {
    scheduleDiagnostics: debounce(250, () => {
      for (let { uri } of openDocuments.all()) {
        try {
          const diagnostics = languageServer.getDiagnostics(uri);
          connection.sendDiagnostics({ uri, diagnostics });
        } catch (error) {
          connection.sendDiagnostics({
            uri,
            diagnostics: [
              {
                range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
                message:
                  'Glint encountered an error computing diagnostics for this file. ' +
                  'This is likely a bug in Glint; please file an issue, including any ' +
                  'code and/or steps to follow to reproduce the error.\n\n' +
                  errorMessage(error),
              },
            ],
          });

          connection.console.error(`Error getting diagnostics for ${uri}.\n${errorMessage(error)}`);
        }
      }
    }),

    captureErrors(callback) {
      try {
        return callback();
      } catch (error) {
        connection.console.error(errorMessage(error));
      }
    },
  };
}

function errorMessage(error: unknown): string {
  return (error instanceof Error && error.stack) || `${error}`;
}
