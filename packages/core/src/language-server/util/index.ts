export { positionToOffset, offsetToPosition } from './position.js';

import { URI } from 'vscode-uri';

export function uriToFilePath(uri: string): string {
  return URI.parse(uri).fsPath.replace(/\\/g, '/');
}

export function filePathToUri(filePath: string): string {
  return URI.file(filePath).toString();
}

export function normalizeFilePath(filePath: string): string {
  return uriToFilePath(filePathToUri(filePath));
}
