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
    let file = diagnostic.file;
    let transformedModule = file && this.transformedModules.get(file.fileName);
    if (diagnostic.code && file && transformedModule) {
      let sourceFile = this.ts.createSourceFile(
        file.fileName,
        transformedModule.originalSource,
        file.languageVersion
      );

      diagnostic = rewriteDiagnostic(diagnostic, transformedModule, sourceFile);
    }

    return this.ts.formatDiagnosticsWithColorAndContext([diagnostic], this.formatDiagnosticHost);
  }

  public readFile(filename: string, encoding?: string): string | undefined {
    let source = this.ts.sys.readFile(filename, encoding);

    // TODO: don't hard-code the relevant import we're interested in
    if (
      filename.endsWith('.ts') &&
      !filename.endsWith('.d.ts') &&
      source?.includes('@glimmerx/component') &&
      this.glintConfig.includesFile(filename)
    ) {
      let transformedModule = rewriteModule(filename, source);
      if (transformedModule) {
        this.transformedModules.set(filename, transformedModule);
        return transformedModule.transformedSource;
      }
    }

    return source;
  }

  private readonly formatDiagnosticHost: ts.FormatDiagnosticsHost = {
    getCanonicalFileName: (name) => name,
    getCurrentDirectory: this.ts.sys.getCurrentDirectory,
    getNewLine: () => this.ts.sys.newLine,
  };

  private buildDiagnostics(transformedModule: TransformedModule): Array<ts.DiagnosticWithLocation> {
    if (!transformedModule.errors.length) {
      return [];
    }

    let sourceFile = this.ts.createSourceFile(
      transformedModule.filename,
      transformedModule.originalSource,
      this.ts.ScriptTarget.ESNext
    );

    return transformedModule.errors.map((error) => ({
      category: this.ts.DiagnosticCategory.Error,
      code: 0,
      file: sourceFile,
      start: error.location.start,
      length: error.location.end - error.location.start,
      messageText: `[glint] ${error.message}`,
    }));
  }
}
