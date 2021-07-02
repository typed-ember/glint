export { positionToOffset, offsetToPosition } from './position';
export { scriptElementKindToCompletionItemKind } from './protocol';

import { URI } from 'vscode-uri';
import type TS from 'typescript';
import path from 'path';

export function isTemplate(uriOrFilePath: string): boolean {
  return uriOrFilePath.endsWith('.hbs');
}

export function uriToFilePath(uri: string): string {
  return URI.parse(uri).fsPath.replace(/\\/g, '/');
}

export function filePathToUri(filePath: string): string {
  return URI.file(filePath).toString();
}

export function normalizeFilePath(filePath: string): string {
  return uriToFilePath(filePathToUri(filePath));
}

export function parseConfigFile(ts: typeof TS, configPath?: string): TS.ParsedCommandLine {
  const tsConfig = ts.readConfigFile(configPath ?? 'tsconfig.json', ts.sys.readFile).config;
  const jsConfig = tsConfig
    ? undefined
    : ts.readConfigFile(configPath ?? 'jsconfig.json', ts.sys.readFile).config;

  const root = configPath ? path.dirname(configPath) : process.cwd();

  // passing through the configPath allows us to support jsconfig as well as tsconfig
  return ts.parseJsonConfigFileContent(tsConfig || jsConfig, ts.sys, root, undefined, configPath);
}
