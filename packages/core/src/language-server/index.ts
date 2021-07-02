import { TextDocuments, createConnection } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { findConfig } from '@glint/config';
import { loadTypeScript } from '../common/load-typescript';
import GlintLanguageServer from './glint-language-server';
import { parseConfigFile, uriToFilePath } from './util';
import { bindLanguageServer } from './binding';
import { isScript } from '../common/document-cache';

const connection = createConnection(process.stdin, process.stdout);
const documents = new TextDocuments(TextDocument);

const ts = loadTypeScript();
const glintConfig = findConfig(process.cwd());
// try to find a jsconfig.json or a tsconfig.json
const configPath =
  ts.findConfigFile(process.cwd(), ts.sys.fileExists, 'jsconfig.json') ||
  ts.findConfigFile(process.cwd(), ts.sys.fileExists);
const { fileNames, options } = parseConfigFile(ts, configPath);

const scriptFileNames = fileNames.filter((fileName) => isScript(fileName));
const baseProjectRoots = new Set(scriptFileNames);
const getRootFileNames = (): Array<string> => {
  return scriptFileNames.concat(
    documents
      .all()
      .map((doc) => uriToFilePath(doc.uri))
      .filter((path) => isScript(path) && !baseProjectRoots.has(path))
  );
};

if (glintConfig) {
  const languageServer = new GlintLanguageServer(ts, glintConfig, getRootFileNames, options);

  bindLanguageServer({ languageServer, documents, connection });

  documents.listen(connection);
  connection.listen();
} else {
  connection.console.info(`No Glint config found from ${process.cwd()}`);
}
