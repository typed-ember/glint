declare module '@volar/language-service' {
  export interface FullDocumentDiagnosticReport {
    kind: string;
    items: any[];
  }

  export interface TextDocument {
    uri: string;
    languageId: string;
    version: number;
    getText(range?: any): string;
    positionAt(offset: number): any;
    offsetAt(position: any): number;
    lineCount: number;
  }
}
