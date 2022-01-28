export { positionToOffset, offsetToPosition } from './position';
export { scriptElementKindToCompletionItemKind } from './protocol';

import { URI } from 'vscode-uri';
import type TS from 'typescript';
import path from 'path';
import ts from 'typescript';
import TransformManager from '../../common/transform-manager';

export function uriToFilePath(uri: string): string {
  return URI.parse(uri).fsPath.replace(/\\/g, '/');
}

export function filePathToUri(filePath: string): string {
  return URI.file(filePath).toString();
}

export function normalizeFilePath(filePath: string): string {
  return uriToFilePath(filePathToUri(filePath));
}

export function parseConfigFile(
  ts: typeof TS,
  transformManager: TransformManager,
  searchFrom = process.cwd()
): TS.ParsedCommandLine {
  let configPath = findNearestConfigFile(ts, searchFrom);
  let config = ts.readConfigFile(configPath, ts.sys.readFile).config;
  let root = configPath ? path.dirname(configPath) : searchFrom;
  let host: ts.ParseConfigHost = {
    ...ts.sys,
    readDirectory: transformManager.readDirectory,
  };

  // passing through the configPath allows us to support jsconfig as well as tsconfig
  return ts.parseJsonConfigFileContent(config, host, root, undefined, configPath);
}

function findNearestConfigFile(ts: typeof TS, searchFrom: string): string {
  // Assume that the longest path is the most relevant one in the case that
  // multiple config files exist at or above our current directory.
  let configCandidates = [
    ts.findConfigFile(searchFrom, ts.sys.fileExists, 'tsconfig.json'),
    ts.findConfigFile(searchFrom, ts.sys.fileExists, 'jsconfig.json'),
    'tsconfig.json',
  ]
    .filter((path): path is string => typeof path === 'string')
    .sort((a, b) => b.length - a.length);

  return configCandidates[0];
}
