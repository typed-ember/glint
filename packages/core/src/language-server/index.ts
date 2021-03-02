import { TextDocuments, TextDocumentSyncKind, createConnection } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { findConfig } from '@glint/config';
import { loadTypeScript } from '../common/load-typescript';
import GlintLanguageServer from './glint-language-server';
import { parseConfigFile, uriToFilePath } from './util';
import { debounce } from '../common/scheduling';

const connection = createConnection(process.stdin, process.stdout);
const documents = new TextDocuments(TextDocument);

const ts = loadTypeScript();
const glintConfig = findConfig(process.cwd());
const tsconfigPath = ts.findConfigFile(process.cwd(), ts.sys.fileExists);
const { fileNames, options } = parseConfigFile(ts, tsconfigPath);
const tsFileNames = fileNames.filter((fileName) => /\.ts$/.test(fileName));
const getRootFileNames = (): Array<string> => {
  return tsFileNames.concat(documents.all().map((doc) => uriToFilePath(doc.uri)));
};

function captureErrors<T>(callback: () => T): T | undefined {
  try {
    return callback();
  } catch (error) {
    connection.console.error(error.stack ?? error);
  }
}

if (glintConfig) {
  const gls = new GlintLanguageServer(ts, glintConfig, getRootFileNames, options);

  connection.onInitialize(() => ({
    capabilities: {
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
    },
  }));

  const scheduleDiagnostics = debounce(250, () => {
    for (let { uri } of documents.all()) {
      connection.sendDiagnostics({
        uri,
        diagnostics: gls.getDiagnostics(uri),
      });
    }
  });

  connection.onDidChangeWatchedFiles(() => {
    // TODO: use this to synchronize files that aren't open so we don't assume changes only
    // happen in the editor.
  });

  documents.onDidOpen(({ document }) => {
    gls.openFile(document.uri, document.getText());

    scheduleDiagnostics();
  });

  documents.onDidClose(({ document }) => {
    gls.closeFile(document.uri);
  });

  documents.onDidChangeContent(({ document }) => {
    gls.updateFile(document.uri, document.getText());

    scheduleDiagnostics();
  });

  connection.onPrepareRename(({ textDocument, position }) => {
    return captureErrors(() => gls.prepareRename(textDocument.uri, position));
  });

  connection.onRenameRequest(({ textDocument, position, newName }) => {
    return captureErrors(() => gls.getEditsForRename(textDocument.uri, position, newName));
  });

  connection.onCompletion(({ textDocument, position }) => {
    return captureErrors(() => gls.getCompletions(textDocument.uri, position));
  });

  connection.onCompletionResolve((item) => {
    return captureErrors(() => gls.getCompletionDetails(item)) ?? item;
  });

  connection.onHover(({ textDocument, position }) => {
    return captureErrors(() => gls.getHover(textDocument.uri, position));
  });

  connection.onDefinition(({ textDocument, position }) => {
    return captureErrors(() => gls.getDefinition(textDocument.uri, position));
  });

  connection.onReferences(({ textDocument, position }) => {
    return captureErrors(() => gls.getReferences(textDocument.uri, position));
  });

  connection.onWorkspaceSymbol(({ query }) => {
    return captureErrors(() => gls.findSymbols(query));
  });

  documents.listen(connection);
  connection.listen();
} else {
  connection.console.info(`No Glint config found from ${process.cwd()}`);
}
