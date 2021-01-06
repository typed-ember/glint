export { lineAndCharacterToPosition, positionTolineAndCharacter } from './position';
export { scriptElementKindToCompletionItemKind } from './completion';

import { URI } from 'vscode-uri';
import * as TS from 'typescript';

export function uriToFilePath(uri: string): string {
  return URI.parse(uri).fsPath.replace(/\\/g, '/');
}

export function filePathToUri(filePath: string): string {
  return URI.file(filePath).toString();
}

export function parseConfigFile(ts: typeof TS, tsconfigPath?: string): TS.ParsedCommandLine {
  const config = ts.readConfigFile(tsconfigPath ?? 'tsconfig.json', ts.sys.readFile).config;
  const root = tsconfigPath ? tsconfigPath.replace(/tsconfig\.json$/, '') : process.cwd();
  return ts.parseJsonConfigFileContent(config, ts.sys, root);
}
