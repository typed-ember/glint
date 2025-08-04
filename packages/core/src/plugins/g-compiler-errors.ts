import type { LanguageServicePlugin } from '@volar/language-service';
import type * as vscode from 'vscode-languageserver-protocol';
import { getEmbeddedInfo } from './utils.js';

/**
 * This LanguageServicePlugin surfaces compiler/syntax errors as diagnostics
 * within .gts/.gjs files, e.g. if there is an unclosed html tag or `{{` curly brace,
 * the entire `<template>` tag region will be highlighted as an error.
 */
export function create(): LanguageServicePlugin {
  return {
    name: 'g-compiler-errors',
    capabilities: {
      diagnosticProvider: {
        interFileDependencies: false,
        workspaceDiagnostics: false,
      },
    },
    create(context) {
      return {
        provideDiagnostics(document) {
          const info = getEmbeddedInfo(context, document, 'gts', (languageId) =>
            ['glimmer-ts', 'glimmer-js'].includes(languageId),
          );
          if (!info) {
            return;
          }
          const { root } = info;

          const transformedModule = root.transformedModule;
          if (!transformedModule) {
            return;
          }

          const parseErrors: vscode.Diagnostic[] = [];

          for (const error of transformedModule.errors) {
            // if ('code' in error) {
            // const start = error.loc?.start.offset ?? 0;
            // const end = error.loc?.end.offset ?? 0;
            const start = 0;
            const end = 10;
            // if (end < startTagEnd || start >= endTagStart) {
            parseErrors.push({
              range: {
                start: document.positionAt(start),
                end: document.positionAt(end),
              },
              severity: 1 satisfies typeof vscode.DiagnosticSeverity.Error,
              code: 9999,
              source: 'glint',
              message: error.message,
            });
            // }
            // }
          }

          return parseErrors;
        },
      };
    },
  };
}
