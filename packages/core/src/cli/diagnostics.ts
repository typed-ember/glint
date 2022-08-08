import type TS from 'typescript';

type TypeScript = typeof TS;

export function buildDiagnosticFormatter(ts: TypeScript): (diagnostic: TS.Diagnostic) => string {
  const formatDiagnosticHost: TS.FormatDiagnosticsHost = {
    getCanonicalFileName: (name) => name,
    getCurrentDirectory: ts.sys.getCurrentDirectory,
    getNewLine: () => ts.sys.newLine,
  };

  return (diagnostic) =>
    ts.formatDiagnosticsWithColorAndContext([diagnostic], formatDiagnosticHost);
}
