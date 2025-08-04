import type { LanguageServicePlugin } from '@volar/language-service';
import type * as vscode from 'vscode-languageserver-protocol';
import { getEmbeddedInfo } from './utils.js';

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
          const info = getEmbeddedInfo(context, document, 'gts', (languageId) =>
            ['glimmer-ts', 'glimmer-js'].includes(languageId),
          );
          if (!info) {
            return;
          }
          const { root } = info;

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
        },
      };
    },
  };
}
