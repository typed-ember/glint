import { TextDocuments, TextDocumentSyncKind, createConnection } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { loadConfig } from '@glint/config';
import { loadTypeScript } from '../common/load-typescript';
import GlintLanguageServer from './glint-language-server';
import { parseConfigFile, uriToFilePath } from './util';
import { debounce } from '../common/scheduling';

const connection = createConnection(process.stdin, process.stdout);
const documents = new TextDocuments(TextDocument);

const ts = loadTypeScript();
const glintConfig = loadConfig(process.cwd());
const tsconfigPath = ts.findConfigFile(process.cwd(), ts.sys.fileExists);
const { fileNames, options } = parseConfigFile(ts, tsconfigPath);
const tsFileNames = fileNames.filter((fileName) => /\.ts$/.test(fileName));
const getRootFileNames = (): Array<string> => {
  return tsFileNames.concat(documents.all().map((doc) => uriToFilePath(doc.uri)));
};

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
  return gls.prepareRename(textDocument.uri, position);
});

connection.onRenameRequest(({ textDocument, position, newName }) => {
  return gls.getEditsForRename(textDocument.uri, position, newName);
});

connection.onCompletion(({ textDocument, position }) => {
  return gls.getCompletions(textDocument.uri, position);
});

connection.onCompletionResolve((item) => {
  return gls.getCompletionDetails(item);
});

connection.onHover(({ textDocument, position }) => {
  return gls.getHover(textDocument.uri, position);
});

connection.onDefinition(({ textDocument, position }) => {
  return gls.getDefinition(textDocument.uri, position);
});

connection.onReferences(({ textDocument, position }) => {
  return gls.getReferences(textDocument.uri, position);
});

connection.onWorkspaceSymbol(({ query }) => {
  return gls.findSymbols(query);
});

documents.listen(connection);
connection.listen();
