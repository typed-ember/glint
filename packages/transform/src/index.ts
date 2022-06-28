export type { Directive, default as TransformedModule } from './template/transformed-module';
export type { Diagnostic } from './diagnostics';

export { rewriteModule } from './template/rewrite-module';
export { rewriteDiagnostic, createTransformDiagnostic } from './diagnostics';
