import { TextDocuments, createConnection } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { findConfig } from '@glint/config';
import { loadTypeScript } from '../common/load-typescript';
import GlintLanguageServer from './glint-language-server';
import { parseConfigFile, uriToFilePath } from './util';
import { bindLanguageServer } from './binding';

const connection = createConnection(process.stdin, process.stdout);
const documents = new TextDocuments(TextDocument);

const ts = loadTypeScript();
const glintConfig = findConfig(process.cwd());
const tsconfigPath = ts.findConfigFile(process.cwd(), ts.sys.fileExists);
const { fileNames, options } = parseConfigFile(ts, tsconfigPath);

const tsFileNames = fileNames.filter((fileName) => /\.ts$/.test(fileName));
const baseProjectRoots = new Set(tsFileNames);
const getRootFileNames = (): Array<string> => {
  return tsFileNames.concat(
    documents
      .all()
      .map((doc) => uriToFilePath(doc.uri))
      .filter((path) => path.endsWith('.ts') && !baseProjectRoots.has(path))
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
