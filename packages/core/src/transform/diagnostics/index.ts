import type * as ts from 'typescript';

export type Diagnostic = ts.Diagnostic & {
  isContentTagError?: boolean;
};
