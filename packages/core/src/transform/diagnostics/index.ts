import type * as ts from 'typescript';

export type Diagnostic = ts.Diagnostic & { isGlintTransformDiagnostic?: boolean };

export { rewriteDiagnostic } from './rewrite-diagnostic.js';
export { createTransformDiagnostic } from './create-transform-diagnostic.js';
