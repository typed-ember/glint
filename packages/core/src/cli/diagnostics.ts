import type ts from 'typescript';

export function buildDiagnosticFormatter(
  ts: typeof import('typescript')
): (diagnostic: ts.Diagnostic) => string {
  const formatDiagnosticHost: ts.FormatDiagnosticsHost = {
    getCanonicalFileName: (name) => name,
    getCurrentDirectory: ts.sys.getCurrentDirectory,
    getNewLine: () => ts.sys.newLine,
  };

  return (diagnostic) =>
    ts.formatDiagnosticsWithColorAndContext([diagnostic], formatDiagnosticHost);
}
