// This file is the bin/entrypoint for the glint language server
// require()ing this file has the effect of starting the language server and
// having it connect to the port provided to it, etc.
//
// in Volar this has been moved to src/volar/language-server.ts
//
// original code:


// import { TextDocuments, createConnection } from 'vscode-languageserver/node.js';
// import { TextDocument } from 'vscode-languageserver-textdocument';
// import { bindLanguageServerPool } from './binding.js';
// import { LanguageServerPool } from './pool.js';

// const connection = createConnection(process.stdin, process.stdout);
// const openDocuments = new TextDocuments(TextDocument);
// const pool = new LanguageServerPool(connection, openDocuments);

// bindLanguageServerPool({ connection, openDocuments, pool });

// openDocuments.listen(connection);
// connection.listen();
