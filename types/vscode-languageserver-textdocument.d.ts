declare module 'vscode-languageserver-textdocument' {
  export interface TextDocument {
    uri: string;
    languageId: string;
    version: number;
    getText(range?: any): string;
    positionAt(offset: number): any;
    offsetAt(position: any): number;
    lineCount: number;
  }

  export namespace TextDocument {
    export function create(uri: string, languageId: string, version: number, content: string): TextDocument;
  }
}
