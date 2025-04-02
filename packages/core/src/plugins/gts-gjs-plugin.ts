import type { LanguageServiceContext, LanguageServicePlugin } from '@volar/language-service';
import { VirtualGtsCode } from '../volar/gts-virtual-code.js';
import type * as vscode from 'vscode-languageserver-protocol';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';

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

            // result.push({
            //   name: 'test_fake_symbol',
            //   kind: 2 satisfies typeof vscode.SymbolKind.Module,
            //   range: {
            //     start: document.positionAt(0),
            //     end: document.positionAt(10),
            //   },
            //   selectionRange: {
            //     start: document.positionAt(0),
            //     end: document.positionAt(10),
            //   },
            // });

            // if (sfc.template) {
            //   result.push({
            //     name: 'template',
            //     kind: 2 satisfies typeof vscode.SymbolKind.Module,
            //     range: {
            //       start: document.positionAt(sfc.template.start),
            //       end: document.positionAt(sfc.template.end),
            //     },
            //     selectionRange: {
            //       start: document.positionAt(sfc.template.start),
            //       end: document.positionAt(sfc.template.startTagEnd),
            //     },
            //   });
            // }
            // if (sfc.script) {
            //   result.push({
            //     name: 'script',
            //     kind: 2 satisfies typeof vscode.SymbolKind.Module,
            //     range: {
            //       start: document.positionAt(sfc.script.start),
            //       end: document.positionAt(sfc.script.end),
            //     },
            //     selectionRange: {
            //       start: document.positionAt(sfc.script.start),
            //       end: document.positionAt(sfc.script.startTagEnd),
            //     },
            //   });
            // }
            // if (sfc.scriptSetup) {
            //   result.push({
            //     name: 'script setup',
            //     kind: 2 satisfies typeof vscode.SymbolKind.Module,
            //     range: {
            //       start: document.positionAt(sfc.scriptSetup.start),
            //       end: document.positionAt(sfc.scriptSetup.end),
            //     },
            //     selectionRange: {
            //       start: document.positionAt(sfc.scriptSetup.start),
            //       end: document.positionAt(sfc.scriptSetup.startTagEnd),
            //     },
            //   });
            // }
            // for (const style of sfc.styles) {
            //   let name = 'style';
            //   if (style.scoped) {
            //     name += ' scoped';
            //   }
            //   if (style.module) {
            //     name += ' module';
            //   }
            //   result.push({
            //     name,
            //     kind: 2 satisfies typeof vscode.SymbolKind.Module,
            //     range: {
            //       start: document.positionAt(style.start),
            //       end: document.positionAt(style.end),
            //     },
            //     selectionRange: {
            //       start: document.positionAt(style.start),
            //       end: document.positionAt(style.startTagEnd),
            //     },
            //   });
            // }
            // for (const customBlock of sfc.customBlocks) {
            //   result.push({
            //     name: `${customBlock.type}`,
            //     kind: 2 satisfies typeof vscode.SymbolKind.Module,
            //     range: {
            //       start: document.positionAt(customBlock.start),
            //       end: document.positionAt(customBlock.end),
            //     },
            //     selectionRange: {
            //       start: document.positionAt(customBlock.start),
            //       end: document.positionAt(customBlock.startTagEnd),
            //     },
            //   });
            // }

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
