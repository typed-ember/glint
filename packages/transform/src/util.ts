import type ts from 'typescript';
import { SourceFile } from './transformed-module';

export function unreachable(value: never, message = 'unreachable code'): never {
  throw new Error(`[@glint/transform] Internal error: ${message}`);
}

export function assert(test: unknown, message = 'Internal error'): asserts test {
  if (test == null || test === false) {
    throw new Error(message);
  }
}

export function isJsScript(uriOrFilePath: string): boolean {
  return uriOrFilePath.endsWith('.js');
}

export function createSyntheticSourceFile(tsImpl: typeof ts, source: SourceFile): ts.SourceFile {
  return Object.assign(tsImpl.createSourceFile(source.filename, '', tsImpl.ScriptTarget.Latest), {
    text: source.contents,
    end: source.contents.length,
  });
}
