import { TextDocuments, createConnection } from 'vscode-languageserver/node.js';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { bindLanguageServerPool } from './binding.js';
import { LanguageServerPool } from './pool.js';

const connection = createConnection(process.stdin, process.stdout);
const openDocuments = new TextDocuments(TextDocument);
const pool = new LanguageServerPool(connection, openDocuments);

bindLanguageServerPool({ connection, openDocuments, pool });

openDocuments.listen(connection);
connection.listen();
