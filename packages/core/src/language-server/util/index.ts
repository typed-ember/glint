export { positionToOffset, offsetToPosition } from './position.js';
export { scriptElementKindToCompletionItemKind } from './protocol.js';

import VSCodeURI from 'vscode-uri';

export function uriToFilePath(uri: string): string {
  return VSCodeURI.URI.parse(uri).fsPath.replace(/\\/g, '/');
}

export function filePathToUri(filePath: string): string {
  return VSCodeURI.URI.file(filePath).toString();
}

export function normalizeFilePath(filePath: string): string {
  return uriToFilePath(filePathToUri(filePath));
}
