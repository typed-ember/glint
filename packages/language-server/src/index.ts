import {
  DiagnosticSeverity,
  TextDocuments,
  createConnection,
  Diagnostic,
  TextDocumentChangeEvent,
  TextDocumentSyncKind,
  TextDocumentPositionParams,
  CompletionItem,
  Hover,
  HoverParams,
  DefinitionParams,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { loadConfig } from '@glint/config';
import { loadTypeScript } from './load-typescript';
import GlintLanguageServer from './glint-language-server';
import { parseConfigFile, uriToFilePath, scriptElementKindToCompletionItemKind } from './util';

const ts = loadTypeScript();
const glintConfig = loadConfig(process.cwd());
const tsconfigPath = ts.findConfigFile(process.cwd(), ts.sys.fileExists);
const { fileNames, options } = parseConfigFile(ts, tsconfigPath);
const tsFileNames = fileNames.filter((fileName) => /\.ts$/.test(fileName));
const gls = new GlintLanguageServer(ts, glintConfig, tsFileNames, options);

const connection = createConnection(process.stdin, process.stdout);
const documents = new TextDocuments(TextDocument);

connection.onInitialize(() => ({
  capabilities: {
    textDocumentSync: TextDocumentSyncKind.Full,
    completionProvider: {
      resolveProvider: true,
    },
    hoverProvider: true,
    definitionProvider: true,
  },
}));

documents.onDidChangeContent((change: TextDocumentChangeEvent<TextDocument>): void => {
  const { document } = change;
  const templateFileName = uriToFilePath(document.uri);
  gls.updateTemplate(templateFileName, document.getText());
  const templateDiagnostics = gls.getTemplateDiagnostics(templateFileName);

  const diagnostics: Array<Diagnostic> = templateDiagnostics.map((tmplDiag) => ({
    severity: DiagnosticSeverity.Error,
    range: {
      start: document.positionAt(tmplDiag.start || 0),
      end: document.positionAt((tmplDiag.start || 0) + (tmplDiag.length || 0)),
    },
    message: ts.flattenDiagnosticMessageText(tmplDiag.messageText, '\n'),
    source: 'glint',
  }));

  connection.sendDiagnostics({
    uri: document.uri,
    diagnostics,
  });
});

type GlintCompletionData = {
  uri: string;
  line: number;
  character: number;
  source?: string;
};

type GlintCompletionItem = Omit<CompletionItem, 'data'> & { data?: GlintCompletionData };

connection.onCompletion((positionParams: TextDocumentPositionParams): GlintCompletionItem[] => {
  const {
    textDocument: { uri },
    position: { line, character },
  } = positionParams;
  const templateFileName = uriToFilePath(uri);
  const completions = gls.getCompletions(templateFileName, line, character);
  return completions
    ? completions.entries.map((completion) => ({
        label: completion.name,
        kind: scriptElementKindToCompletionItemKind(completion.kind),
        data: { uri, line, character, source: completion.source },
      }))
    : [];
});

connection.onCompletionResolve(
  (item: GlintCompletionItem): GlintCompletionItem => {
    const { label, data } = item;
    if (!data) {
      return item;
    }
    const { uri, line, character, source } = data;
    const templateFileName = uriToFilePath(uri);
    const details = gls.getCompletionDetails(templateFileName, line, character, label, source);
    if (details) {
      item.detail = details.detail;
      item.documentation = {
        kind: 'markdown',
        value: details.documentation,
      };
    }
    return item;
  }
);

connection.onHover((hoverParams: HoverParams): Hover | undefined => {
  const {
    textDocument: { uri },
    position: { line, character },
  } = hoverParams;
  const templateFileName = uriToFilePath(uri);
  return gls.getHover(templateFileName, line, character);
});

connection.onDefinition((definitionParams: DefinitionParams) => {
  const {
    textDocument: { uri },
    position: { line, character },
  } = definitionParams;
  const templateFileName = uriToFilePath(uri);
  return gls.getDefinition(templateFileName, line, character);
});

documents.listen(connection);
connection.listen();
