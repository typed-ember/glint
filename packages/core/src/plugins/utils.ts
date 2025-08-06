// based on https://github.com/vuejs/language-tools/blob/master/packages/language-service/lib/utils.ts

import {
  type LanguageServiceContext,
  type SourceScript,
  type TextDocument,
  type VirtualCode,
} from '@volar/language-service';
import { URI } from 'vscode-uri';
import { VirtualGtsCode } from '../volar/gts-virtual-code.js';

type EmbeddedInfo = {
  sourceScript: Required<SourceScript<URI>>;
  virtualCode: VirtualCode;
  root: VirtualGtsCode;
};

/**
 * Helper function that accepts a document URI and, if it matches the format
 * of Volar's special URI format for representing embedded codes within a virtual code,
 * will look up and return the embedded code and its root VirtualGtsCode.
 *
 * A example Volar embedded document URI would be something like:
 *
 *    volar-embedded-content://gts/file%253A%252F%252F%252FUsers%252Fmachty%252Fcode%252Fglint%252Ftest-packages%252Fts-template-imports-app%252Fsrc%252Fempty-fixture.gts
 *
 * Note that the hostname/authority part of the URI is the embedded code ID, e.g. `gts`. These correspond
 * to the IDs we assign to parsed embedded virtual codes contained within the root virtual code,
 * e.g. `ts` corresponds to the TypeScript representation of .gts files where all `<template>` tags
 * have been converted to type-checkable TS.
 */
export function getEmbeddedInfo(
  context: LanguageServiceContext,
  document: TextDocument,
  desiredEmbeddedCodeId?: string | ((id: string) => boolean),
  desiredDocumentLanguageId?: string | ((id: string) => boolean),
): EmbeddedInfo | undefined {
  const uri = URI.parse(document.uri);
  const decoded = context.decodeEmbeddedDocumentUri(uri);
  if (!decoded) {
    return;
  }

  const [documentUri, embeddedCodeId] = decoded;

  if (desiredEmbeddedCodeId) {
    if (typeof desiredEmbeddedCodeId === 'string') {
      if (embeddedCodeId !== desiredEmbeddedCodeId) {
        return;
      }
    } else if (!desiredEmbeddedCodeId(embeddedCodeId)) {
      return;
    }
  }

  if (desiredDocumentLanguageId) {
    if (typeof desiredDocumentLanguageId === 'string') {
      if (document.languageId !== desiredDocumentLanguageId) {
        return;
      }
    } else if (!desiredDocumentLanguageId(document.languageId)) {
      return;
    }
  }

  const sourceScript = context.language.scripts.get(documentUri);
  if (!sourceScript?.generated) {
    return;
  }

  const virtualCode = sourceScript.generated.embeddedCodes.get(embeddedCodeId);
  if (!virtualCode) {
    return;
  }

  const root = sourceScript.generated.root;
  if (!(root instanceof VirtualGtsCode)) {
    return;
  }

  return {
    sourceScript: sourceScript as Required<SourceScript<URI>>,
    virtualCode,
    root,
  };
}
