import { TextDocuments, createConnection } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { bindLanguageServerPool } from './binding';
import { LanguageServerPool } from './pool';

const connection = createConnection(process.stdin, process.stdout);
const openDocuments = new TextDocuments(TextDocument);
const pool = new LanguageServerPool(connection, openDocuments);

bindLanguageServerPool({ connection, openDocuments, pool });

openDocuments.listen(connection);
connection.listen();
