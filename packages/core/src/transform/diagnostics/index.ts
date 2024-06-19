import type * as vscode from 'vscode-languageserver-protocol';

export type Diagnostic = vscode.Diagnostic & {
  isGlintTransformDiagnostic?: boolean;
  isContentTagError?: boolean;
};

// export { rewriteDiagnostic } from './rewrite-diagnostic.js';
// export { createTransformDiagnostic } from './create-transform-diagnostic.js';
