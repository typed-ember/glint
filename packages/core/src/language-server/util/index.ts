export { positionToOffset, offsetToPosition } from './position';
export { scriptElementKindToCompletionItemKind } from './protocol';

import { URI } from 'vscode-uri';
import type TS from 'typescript';

export function uriToFilePath(uri: string): string {
  return URI.parse(uri).fsPath.replace(/\\/g, '/');
}

export function filePathToUri(filePath: string): string {
  return URI.file(filePath).toString();
}

export function normalizeFilePath(filePath: string): string {
  return uriToFilePath(filePathToUri(filePath));
}

export function parseConfigFile(ts: typeof TS, tsconfigPath?: string): TS.ParsedCommandLine {
  const config = ts.readConfigFile(tsconfigPath ?? 'tsconfig.json', ts.sys.readFile).config;
  const root = tsconfigPath ? tsconfigPath.replace(/tsconfig\.json$/, '') : process.cwd();
  return ts.parseJsonConfigFileContent(config, ts.sys, root);
}
