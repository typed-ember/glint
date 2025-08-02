import type { LanguageServiceContext, LanguageServicePlugin } from '@volar/language-service';
import { VirtualGtsCode } from '../volar/gts-virtual-code.js';
import type * as vscode from 'vscode-languageserver-protocol';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';

/**
 * This is a LanguageServicePlugin that provides language features for the top-level .gts/.gjs files.
 * For now, this just provides document symbols for `<template>` tags, which are a language
 * construct specific to .gts/.gjs files. Note that .gts/.gjs files will have TypeScript symbols
 * provided by our syntactic TS LanguageServicePlugin configured elsewhere, and these will be
 * combined with the symbols provided here.
 */
export function create(): LanguageServicePlugin {
  return {
    name: 'gts-gjs',
    capabilities: {
      documentSymbolProvider: true,
    },
    create(context) {
      return {
        provideDocumentSymbols(document) {
          return worker(document, context, (root) => {
            const result: vscode.DocumentSymbol[] = [];
            const { transformedModule } = root;

            if (transformedModule) {
              const templateSymbols = transformedModule.templateSymbols();
              for (const templateSymbol of templateSymbols) {
                result.push({
                  name: 'template',
                  kind: 2 satisfies typeof vscode.SymbolKind.Module,
                  range: {
                    start: document.positionAt(templateSymbol.start),
                    end: document.positionAt(templateSymbol.end),
                  },
                  selectionRange: {
                    start: document.positionAt(templateSymbol.start),
                    end: document.positionAt(templateSymbol.startTagEnd),
                  },
                });
              }
            }

            return result;
          });
        },
      };
    },
  };

  function worker<T>(
    document: TextDocument,
    context: LanguageServiceContext,
    callback: (root: VirtualGtsCode) => T,
  ): T | undefined {
    if (document.languageId !== 'glimmer-ts' && document.languageId !== 'glimmer-js') {
      return;
    }
    const uri = URI.parse(document.uri);
    const decoded = context.decodeEmbeddedDocumentUri(uri);
    const sourceScript = decoded && context.language.scripts.get(decoded[0]);
    const root = sourceScript?.generated?.root;
    if (root instanceof VirtualGtsCode) {
      return callback(root);
    }
  }
}
