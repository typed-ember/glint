import { TransformedModule, rewriteModule, rewriteDiagnostic } from '@glint/transform';
import type ts from 'typescript';
import { GlintConfig } from '@glint/config';
import { assert } from '@glint/transform/lib/util';

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

  public watchFile = (
    path: string,
    callback: ts.FileWatcherCallback,
    pollingInterval?: number,
    options?: ts.WatchOptions
  ): ts.FileWatcher => {
    const { watchFile } = this.ts.sys;
    assert(watchFile);

    let rootWatcher = watchFile(path, callback, pollingInterval, options);
    let templatePaths = this.glintConfig.environment.getPossibleTemplatePaths(path);

    if (this.glintConfig.includesFile(path) && templatePaths.length) {
      let templateWatchers = templatePaths.map((candidate) =>
        watchFile(candidate, (_, event) => callback(path, event), pollingInterval, options)
      );

      return {
        close() {
          rootWatcher.close();
          templateWatchers.forEach((watcher) => watcher.close());
        },
      };
    }

    return rootWatcher;
  };

  public readFile = (filename: string, encoding?: string): string | undefined => {
    let contents = this.ts.sys.readFile(filename, encoding);
    let config = this.glintConfig;

    if (
      contents &&
      filename.endsWith('.ts') &&
      !filename.endsWith('.d.ts') &&
      config.includesFile(filename)
    ) {
      let mayHaveTaggedTemplates = contents && config.environment.moduleMayHaveTagImports(contents);
      let templateCandidates = config.environment.getPossibleTemplatePaths(filename);
      let templatePath = templateCandidates.find((candidate) => this.ts.sys.fileExists(candidate));
      if (!mayHaveTaggedTemplates && !templatePath) {
        return contents;
      }

      let script = { filename, contents };
      let template = templatePath
        ? { filename: templatePath, contents: this.ts.sys.readFile(templatePath) ?? '' }
        : undefined;

      let transformedModule = rewriteModule({ script, template }, config.environment);
      if (transformedModule) {
        this.transformedModules.set(filename, transformedModule);
        return transformedModule.transformedContents;
      }
    }

    return contents;
  };

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
