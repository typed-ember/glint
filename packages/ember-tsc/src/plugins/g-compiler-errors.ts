import type { LanguageServicePlugin } from '@volar/language-service';
import type * as vscode from 'vscode-languageserver-protocol';
import { getEmbeddedInfo } from './utils.js';

/**
 * This LanguageServicePlugin surfaces compiler/syntax errors as diagnostics
 * within .gts/.gjs files, e.g. if there is an unclosed html tag or `{{` curly brace,
 * the entire `<template>` tag region will be highlighted as an error.
 *
 * @GLINT_FEATURE_DIAGNOSTICS
 * @GLINT_FEATURE_DIAGNOSTICS_LANGUAGE_SERVER
 * @GLINT_FEATURE_DIAGNOSTICS_LANGUAGE_SERVER_GTS_COMPILER_ERRORS
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
          // `gts` is the ID of the root virtual code within the virtual/embedded code tree of our GtsVirtualCode.
          // It is the untransformed .gts file; we use this file to generate diagnostics for
          // `<template>` tag compiler errors because the diagnostic regions within the errors
          // we get back from the compiler are already relative to the root/outer .gts file
          // rather than relative to start of the template tag.
          const info = getEmbeddedInfo(context, document, 'gts');

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
            const start = document.positionAt(error.location.start);
            const end = document.positionAt(error.location.end);

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
