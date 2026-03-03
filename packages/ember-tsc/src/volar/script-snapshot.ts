/**
 * @typedef {import('typescript').IScriptSnapshot} IScriptSnapshot
 */

import { IScriptSnapshot, TextChangeRange } from 'typescript';

/**
 * A TypeScript compatible script snapshot that wraps a string of text.
 *
 * @implements {IScriptSnapshot}
 */
export class ScriptSnapshot implements IScriptSnapshot {
  constructor(public text: string) {}

  // Not Implemented
  getChangeRange(_oldSnapshot: IScriptSnapshot): TextChangeRange | undefined {
    return undefined;
  }

  getLength(): number {
    return this.text.length;
  }

  getText(start: number, end: number): string {
    return this.text.slice(start, end);
  }
}
