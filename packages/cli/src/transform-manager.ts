import { TransformedModule, rewriteModule, rewriteDiagnostic } from '@glint/transform';
import type ts from 'typescript';
import { GlintConfig } from '@glint/config';

export default class TransformManager {
  private transformedModules = new Map<string, TransformedModule>();

  constructor(private ts: typeof import('typescript'), private glintConfig: GlintConfig) {}

  public getTransformDiagnostics(sourceFile?: ts.SourceFile): Array<ts.Diagnostic> {
    if (sourceFile) {
      let transformedModule = this.transformedModules.get(sourceFile.fileName);
      return transformedModule ? this.buildDiagnostics(transformedModule) : [];
    }

    return [...this.transformedModules.values()].flatMap((transformedModule) => {
      return this.buildDiagnostics(transformedModule);
    });
  }

  public formatDiagnostic(diagnostic: ts.Diagnostic): string {
    let transformedDiagnostic = rewriteDiagnostic(this.ts, diagnostic, (fileName) =>
      this.transformedModules.get(fileName)
    );

    return this.ts.formatDiagnosticsWithColorAndContext(
      [transformedDiagnostic],
      this.formatDiagnosticHost
    );
  }

  public readFile(filename: string, encoding?: string): string | undefined {
    let contents = this.ts.sys.readFile(filename, encoding);
    let config = this.glintConfig;

    if (
      contents &&
      filename.endsWith('.ts') &&
      !filename.endsWith('.d.ts') &&
      config.includesFile(filename) &&
      config.environment.moduleMayHaveTagImports(contents)
    ) {
      let script = { filename, contents };
      let transformedModule = rewriteModule({ script }, config.environment);
      if (transformedModule) {
        this.transformedModules.set(filename, transformedModule);
        return transformedModule.transformedContents;
      }
    }

    return contents;
  }

  private readonly formatDiagnosticHost: ts.FormatDiagnosticsHost = {
    getCanonicalFileName: (name) => name,
    getCurrentDirectory: this.ts.sys.getCurrentDirectory,
    getNewLine: () => this.ts.sys.newLine,
  };

  private buildDiagnostics(transformedModule: TransformedModule): Array<ts.DiagnosticWithLocation> {
    return transformedModule.errors.map((error) => ({
      category: this.ts.DiagnosticCategory.Error,
      code: 0,
      file: this.ts.createSourceFile(
        error.source.filename,
        error.source.contents,
        this.ts.ScriptTarget.Latest
      ),
      start: error.location.start,
      length: error.location.end - error.location.start,
      messageText: `[glint] ${error.message}`,
    }));
  }
}
