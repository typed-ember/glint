import { TextDocuments, createConnection } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { findConfig } from '@glint/config';
import { loadTypeScript } from '../common/load-typescript';
import GlintLanguageServer from './glint-language-server';
import { parseConfigFile } from './util';
import { bindLanguageServer } from './binding';
import DocumentCache from '../common/document-cache';
import TransformManager from '../common/transform-manager';

const connection = createConnection(process.stdin, process.stdout);
const openDocuments = new TextDocuments(TextDocument);
const glintConfig = findConfig(process.cwd());

if (glintConfig) {
  const ts = loadTypeScript();
  const documentCache = new DocumentCache(ts, glintConfig);
  const transformManager = new TransformManager(ts, glintConfig, documentCache);
  const tsConfig = parseConfigFile(ts, transformManager);

  const languageServer = new GlintLanguageServer(
    ts,
    glintConfig,
    documentCache,
    transformManager,
    tsConfig
  );

  bindLanguageServer({ languageServer, openDocuments, connection });

  openDocuments.listen(connection);
  connection.listen();
} else {
  connection.console.info(`No Glint config found from ${process.cwd()}`);
}
