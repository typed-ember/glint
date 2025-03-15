declare module '@volar/language-server' {
  export interface Position {
    line: number;
    character: number;
  }

  export interface Range {
    start: Position;
    end: Position;
  }

  export interface TextEdit {
    range: Range;
    newText: string;
  }

  export const ConfigurationRequest: {
    type: any;
  };

  export interface WorkspaceSymbolParams {
    query: string;
  }
}

declare module '@volar/language-server/node.js' {
  export const WorkspaceSymbolRequest: {
    type: any;
  };

  export interface WorkspaceSymbolParams {
    query: string;
  }
}
