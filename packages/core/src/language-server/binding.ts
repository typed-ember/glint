import {
  Connection,
  FileChangeType,
  ServerCapabilities,
  SymbolInformation,
  TextDocuments,
  TextDocumentSyncKind,
  CodeActionTriggerKind,
  CodeActionKind,
} from '@volar/language-server';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { GlintCompletionItem } from './glint-language-server.js';
import { LanguageServerPool } from './pool.js';
import { GetIRRequest, SortImportsRequest } from './messages.cjs';
import type * as ts from 'typescript';

export const capabilities: ServerCapabilities = {
  textDocumentSync: TextDocumentSyncKind.Full,
  completionProvider: {
    resolveProvider: true,
    // By default `@` won't trigger autocompletion, but it's an important character
    // for us since it signifies the beginning of an arg name.
    triggerCharacters: ['.', '@'],
    completionItem: {
      labelDetailsSupport: true,
    },
  },
  referencesProvider: true,
  hoverProvider: true,
  codeActionProvider: {
    codeActionKinds: [CodeActionKind.QuickFix],
  },
  definitionProvider: true,
  workspaceSymbolProvider: true,
  renameProvider: {
    prepareProvider: true,
  },
};

const PREFERENCES: ts.UserPreferences = {
  includeCompletionsForImportStatements: true,
  includeCompletionsForModuleExports: true,
  includeCompletionsWithSnippetText: true,
  includeAutomaticOptionalChainCompletions: true,
  includeCompletionsWithInsertText: true,
  includeCompletionsWithClassMemberSnippets: true,
  includeCompletionsWithObjectLiteralMethodSnippets: true,
  useLabelDetailsInCompletionEntries: true,
  importModuleSpecifierPreference: 'shortest',
  importModuleSpecifierEnding: 'auto',
  allowTextChangesInNewFiles: true,
  providePrefixAndSuffixTextForRename: true,
  includePackageJsonAutoImports: 'auto',
  provideRefactorNotApplicableReason: true,
  jsxAttributeCompletionStyle: 'auto',
  includeInlayParameterNameHints: 'all',
  includeInlayParameterNameHintsWhenArgumentMatchesName: true,
  includeInlayFunctionParameterTypeHints: true,
  includeInlayVariableTypeHints: true,
  includeInlayVariableTypeHintsWhenTypeMatchesName: true,
  includeInlayPropertyDeclarationTypeHints: true,
  includeInlayFunctionLikeReturnTypeHints: true,
  includeInlayEnumMemberValueHints: true,
  allowRenameOfImportPath: true,
  autoImportFileExcludePatterns: [],
};

const FORMATTING_OPTIONS: ts.FormatCodeSettings = {};

export type BindingArgs = {
  openDocuments: TextDocuments<TextDocument>;
  connection: Connection;
  pool: LanguageServerPool;
};

export function bindLanguageServerPool({ connection, pool, openDocuments }: BindingArgs): void {
  connection.onInitialize(() => {
    return { capabilities };
  });

  openDocuments.onDidOpen(({ document }) => {
    pool.withServerForURI(document.uri, ({ server, scheduleDiagnostics }) => {
      server.openFile(document.uri, document.getText());
      scheduleDiagnostics();
    });
  });

  openDocuments.onDidClose(({ document }) => {
    pool.withServerForURI(document.uri, ({ server }) => {
      server.closeFile(document.uri);
    });
  });

  openDocuments.onDidChangeContent(({ document }) => {
    pool.withServerForURI(document.uri, ({ server, scheduleDiagnostics }) => {
      server.updateFile(document.uri, document.getText());
      scheduleDiagnostics();
    });
  });

  connection.onCodeAction(({ textDocument, range, context }) => {
    return pool.withServerForURI(textDocument.uri, ({ server }) => {
      // The user actually asked for the fix
      // @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#codeActionTriggerKind
      if (context.triggerKind === CodeActionTriggerKind.Invoked) {
        let diagnostics = context.diagnostics;

        let kind = '';

        // QuickFix requests can have their `only` field set to `undefined`.
        // For what we've seen this is only true about `QuickFix`
        if (context.only === undefined) {
          kind = CodeActionKind.QuickFix;
        } else if (context.only.includes(CodeActionKind.QuickFix)) {
          // Otherwise we get the kind passed in the array.
          // Because we only solicit for `CodeFix`s this array will only have
          // a single entry in it.
          kind = CodeActionKind.QuickFix;
        }

        return server.getCodeActions(
          textDocument.uri,
          kind,
          range,
          diagnostics,
          FORMATTING_OPTIONS,
          PREFERENCES
        );
      }

      return [];
    });
  });

  connection.onPrepareRename(({ textDocument, position }) => {
    return pool.withServerForURI(textDocument.uri, ({ server }) =>
      server.prepareRename(textDocument.uri, position)
    );
  });

  connection.onRenameRequest(({ textDocument, position, newName }) => {
    return pool.withServerForURI(textDocument.uri, ({ server }) =>
      server.getEditsForRename(textDocument.uri, position, newName)
    );
  });

  connection.onCompletion(async ({ textDocument, position }) => {
    // Pause briefly to allow any editor change events to be transmitted as well.
    // VS Code explicitly sends the the autocomplete request BEFORE it sends the
    // document update notification.
    await new Promise((r) => setTimeout(r, 25));

    return pool.withServerForURI(textDocument.uri, ({ server }) => {
      return server.getCompletions(textDocument.uri, position, FORMATTING_OPTIONS, PREFERENCES);
    });
  });

  connection.onCompletionResolve((item) => {
    // SAFETY: We should only ever get completion resolution requests for items we ourselves produced
    let glintItem = item as GlintCompletionItem;

    return (
      pool.withServerForURI(glintItem.data.uri, ({ server }) => {
        return server.getCompletionDetails(glintItem, FORMATTING_OPTIONS, PREFERENCES);
      }) ?? item
    );
  });

  connection.onHover(({ textDocument, position }) => {
    return pool.withServerForURI(textDocument.uri, ({ server }) =>
      server.getHover(textDocument.uri, position)
    );
  });

  connection.onDefinition(({ textDocument, position }) => {
    return pool.withServerForURI(textDocument.uri, ({ server }) =>
      server.getDefinition(textDocument.uri, position)
    );
  });

  connection.onReferences(({ textDocument, position }) => {
    return pool.withServerForURI(textDocument.uri, ({ server }) =>
      server.getReferences(textDocument.uri, position)
    );
  });

  connection.onWorkspaceSymbol(({ query }) => {
    let symbols: Array<SymbolInformation> = [];
    pool.forEachServer(({ server }) => {
      symbols.push(...server.findSymbols(query));
    });
    return symbols;
  });

  connection.onRequest(GetIRRequest.type, ({ uri }) => {
    return pool.withServerForURI(uri, ({ server }) => server.getTransformedContents(uri));
  });

  connection.onRequest(SortImportsRequest.type, ({ uri }) => {
    return pool.withServerForURI(uri, ({ server }) => {
      return server.organizeImports(uri, FORMATTING_OPTIONS, PREFERENCES);
    });
  });

  // VSCode will fire this on for: 
  // ['.js', '.ts', '.gjs', '.gts', '.hbs'];
  // ('**/{ts,js}config*.json');
  connection.onDidChangeWatchedFiles(({ changes }) => {
    pool.forEachServer(({ server, scheduleDiagnostics }) => {
      for (let change of changes) {
        if (change.type === FileChangeType.Created) {
          server.watchedFileWasAdded(change.uri);
        } else if (change.type === FileChangeType.Deleted) {
          server.watchedFileWasRemoved(change.uri);
        } else {
          server.watchedFileDidChange(change.uri);
        }
      }

      scheduleDiagnostics();
    });
  });
}
