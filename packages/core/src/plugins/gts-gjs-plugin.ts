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

        // TODO: this is copied from Vue; this might be the proper way for surfacing Glimmer syntax parsing errors to the top-level .gts file.
        // provideDiagnostics(document, token) {
        //   return worker(document, context, async (root) => {
        //     const { vueSfc, sfc } = root;
        //     if (!vueSfc) {
        //       return;
        //     }

        //     const originalResult = await htmlServiceInstance.provideDiagnostics?.(document, token);
        //     const sfcErrors: vscode.Diagnostic[] = [];
        //     const { template } = sfc;

        //     const { startTagEnd = Infinity, endTagStart = -Infinity } = template ?? {};

        //     for (const error of vueSfc.errors) {
        //       if ('code' in error) {
        //         const start = error.loc?.start.offset ?? 0;
        //         const end = error.loc?.end.offset ?? 0;
        //         if (end < startTagEnd || start >= endTagStart) {
        //           sfcErrors.push({
        //             range: {
        //               start: document.positionAt(start),
        //               end: document.positionAt(end),
        //             },
        //             severity: 1 satisfies typeof vscode.DiagnosticSeverity.Error,
        //             code: error.code,
        //             source: 'vue',
        //             message: error.message,
        //           });
        //         }
        //       }
        //     }

        //     return [...(originalResult ?? []), ...sfcErrors];
        //   });
        // },

        // TODO: this is copied from Vue; this might be a good place to implement auto-completing
        // the `<template>` tag and other top-level concerns for .gts files

        // async provideCompletionItems(document, position, context, token) {
        //   const result = await htmlServiceInstance.provideCompletionItems?.(
        //     document,
        //     position,
        //     context,
        //     token,
        //   );
        //   if (!result) {
        //     return;
        //   }
        //   result.items = result.items.filter(
        //     (item) =>
        //       item.label !== '!DOCTYPE' && item.label !== 'Custom Blocks' && item.label !== 'data-',
        //   );

        //   const tags = sfcDataProvider?.provideTags();

        //   const scriptLangs = getLangs('script');
        //   const scriptItems = result.items.filter(
        //     (item) => item.label === 'script' || item.label === 'script setup',
        //   );
        //   for (const scriptItem of scriptItems) {
        //     scriptItem.kind = 17 satisfies typeof vscode.CompletionItemKind.File;
        //     scriptItem.detail = '.js';
        //     for (const lang of scriptLangs) {
        //       result.items.push({
        //         ...scriptItem,
        //         detail: `.${lang}`,
        //         kind: 17 satisfies typeof vscode.CompletionItemKind.File,
        //         label: scriptItem.label + ' lang="' + lang + '"',
        //         textEdit: scriptItem.textEdit
        //           ? {
        //               ...scriptItem.textEdit,
        //               newText: scriptItem.textEdit.newText + ' lang="' + lang + '"',
        //             }
        //           : undefined,
        //       });
        //     }
        //   }

        //   const styleLangs = getLangs('style');
        //   const styleItem = result.items.find((item) => item.label === 'style');
        //   if (styleItem) {
        //     styleItem.kind = 17 satisfies typeof vscode.CompletionItemKind.File;
        //     styleItem.detail = '.css';
        //     for (const lang of styleLangs) {
        //       result.items.push(
        //         getStyleCompletionItem(styleItem, lang),
        //         getStyleCompletionItem(styleItem, lang, 'scoped'),
        //         getStyleCompletionItem(styleItem, lang, 'module'),
        //       );
        //     }
        //   }

        //   const templateLangs = getLangs('template');
        //   const templateItem = result.items.find((item) => item.label === 'template');
        //   if (templateItem) {
        //     templateItem.kind = 17 satisfies typeof vscode.CompletionItemKind.File;
        //     templateItem.detail = '.html';
        //     for (const lang of templateLangs) {
        //       if (lang === 'html') {
        //         continue;
        //       }
        //       result.items.push({
        //         ...templateItem,
        //         kind: 17 satisfies typeof vscode.CompletionItemKind.File,
        //         detail: `.${lang}`,
        //         label: templateItem.label + ' lang="' + lang + '"',
        //         textEdit: templateItem.textEdit
        //           ? {
        //               ...templateItem.textEdit,
        //               newText: templateItem.textEdit.newText + ' lang="' + lang + '"',
        //             }
        //           : undefined,
        //       });
        //     }
        //   }
        //   return result;

        //   function getLangs(label: string) {
        //     return (
        //       tags
        //         ?.find((tag) => tag.name === label)
        //         ?.attributes.find((attr) => attr.name === 'lang')
        //         ?.values?.map(({ name }) => name) ?? []
        //     );
        //   }
        // },
      };
    },
  };

  function worker<T>(
    document: TextDocument,
    context: LanguageServiceContext,
    callback: (root: VirtualGtsCode) => T,
  ) {
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
