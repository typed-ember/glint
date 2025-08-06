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
        /**
         * At the time of writing, this plugin will generate a diagnostic wrapping the ENTIRE
         * `<template>` tag region, including the tags themselves and their contents. This is
         * noisy and unfortunate but I could not find a way around due to the way Volar
         * works internally.
         *
         * Given that `transformedModule.errors` array provides us of the location of the
         * syntax error using ranges based on the original untransformed source, it would
         * seem like an easy task to simply surface that diagnostic from within this plugin.
         *
         * The problem though is that whatever you return from `provideDiagnostics` is going to
         * pass through Volar's reverse-source-mapping logic, i.e. it will assume that the
         * diagnostic "coordinates" you provide it are relative to the transformed TS representation
         * of our .gts code. It will assume this because:
         *
         * 1. As part of the plugin evaluation logic, Volar loops through each embeddedCode associated
         *    with the file we're generated diagnostics for. The first embeddedCode that it calls
         *    `provideDiagnostics` with will be the first one we put in our `embeddedCodes` array
         *    within `packages/core/src/volar/gts-virtual-code.ts`. This happens to be the `template_ts`
         *    transformed TS representation of our .gts code which is more generally used for type-checking.
         * 2. Currently, if you return null/undefined from `provideDiagnostics`, then instead of moving
         *    on to the next embeddedCode (to see if our plugin will generate diagnostics for it), Volar
         *    will treat this as an empty diagnostics array and stop additional diagnostic processing
         *    for this file:
         *    https://github.com/volarjs/volar.js/blob/5e2c8f4ba3e71e322101a94139943edf41e054d1/packages/language-service/lib/features/provideDiagnostics.ts#L166
         *
         * The end result is that we're stuck trying to find a value we can return from this function
         * that Volar can successfully map to the original .gts source code. If you provide it a range
         * within the transformed TS representation, then Volar will not be able to find an exact mapping
         * to the original .gts source code and the diagnostic will be quietly dropped.
         *
         * So, instead of being able to provide a nicely specific diagnostic e.g.
         *
         *      {{unclosedCurly ...
         *      ~~
         *
         * we are stuck with highlighting the entire `<template>` tag region.
         *
         * Perhaps a Volar expert can find a flaw in this reasoning or know what can/should be fixed upstream,
         * but for now we are stuck with bloated diagnostics when syntax errors are present.
         */
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
              transformedModule.originalFileName,
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
