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
  documents: TextDocuments<TextDocument>;
  connection: Connection;
};

export function bindLanguageServer(args: BindingArgs): void {
  let { connection, languageServer, documents } = args;
  let { scheduleDiagnostics, captureErrors } = buildHelpers(args);

  connection.onInitialize(() => ({ capabilities }));

  documents.onDidOpen(({ document }) => {
    languageServer.openFile(document.uri, document.getText());
    scheduleDiagnostics();
  });

  documents.onDidClose(({ document }) => {
    languageServer.closeFile(document.uri);
  });

  documents.onDidChangeContent(({ document }) => {
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

function buildHelpers({ languageServer, documents, connection }: BindingArgs): BindingHelpers {
  return {
    scheduleDiagnostics: debounce(250, () => {
      for (let { uri } of documents.all()) {
        const diagnostics = languageServer.getDiagnostics(uri);
        connection.sendDiagnostics({ uri, diagnostics });
      }
    }),

    captureErrors(callback) {
      try {
        return callback();
      } catch (error: any) {
        connection.console.error(error.stack ?? error);
      }
    },
  };
}
