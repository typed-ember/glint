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
        // TODO: write notes on limitations
        provideDiagnostics(document) {
          const info = getEmbeddedInfo(context, document, 'template_ts');

          if (!info) {
            return;
          }

          const virtualCode = info.root;

          const transformedModule = virtualCode.transformedModule;
          if (!transformedModule) {
            return;
          }

          const parseErrors: vscode.Diagnostic[] = [];

          for (const error of transformedModule.errors) {
            const correlatedSpan = transformedModule.determineTransformedOffsetAndSpan(
              'root.gts',
              error.location.start,
            ).correlatedSpan;

            const start = document.positionAt(correlatedSpan.originalStart);
            const originalSource = correlatedSpan.originalFile.contents;

            const end = offsetToPosition(
              originalSource,
              correlatedSpan.originalStart + correlatedSpan.originalLength,
            );

            parseErrors.push({
              range: {
                start: start,
                end: end,
              },
              severity: 1 satisfies typeof vscode.DiagnosticSeverity.Error,
              code: 9999,
              source: 'glint',
              message: error.message,
            });
          }

          return parseErrors;
        },
      };
    },
  };
}

function offsetToPosition(source: string, offset: number): { line: number; character: number } {
  const lines = source.slice(0, offset).split('\n');
  return {
    line: lines.length - 1,
    character: lines[lines.length - 1].length,
  };
}
