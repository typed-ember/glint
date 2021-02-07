import { TransformedModule, rewriteModule, rewriteDiagnostic } from '@glint/transform';
import type ts from 'typescript';
import { GlintConfig } from '@glint/config';
import { assert } from '@glint/transform/lib/util';
import DocumentCache, { isTemplate } from './document-cache';

export default class TransformManager {
  private transformCache = new Map<
    string,
    { version: string; transformedModule: TransformedModule }
  >();

  constructor(
    private ts: typeof import('typescript'),
    private glintConfig: GlintConfig,
    private documents: DocumentCache = new DocumentCache(ts, glintConfig)
  ) {}

  public getTransformDiagnostics(fileName?: string): Array<ts.Diagnostic> {
    if (fileName) {
      let transformedModule = this.transformCache.get(fileName)?.transformedModule;
      return transformedModule ? this.buildDiagnostics(transformedModule) : [];
    }

    return [...this.transformCache.values()].flatMap((transformedModule) => {
      return this.buildDiagnostics(transformedModule.transformedModule);
    });
  }

  public rewriteDiagnostic(diagnostic: ts.Diagnostic): ts.Diagnostic {
    return rewriteDiagnostic(
      this.ts,
      diagnostic,
      (fileName) => this.transformCache.get(fileName)?.transformedModule
    );
  }

  public formatDiagnostic(diagnostic: ts.Diagnostic): string {
    return this.ts.formatDiagnosticsWithColorAndContext(
      [this.rewriteDiagnostic(diagnostic)],
      this.formatDiagnosticHost
    );
  }

  public getTransformedRange(
    originalFileName: string,
    originalStart: number,
    originalEnd: number
  ): { transformedFileName: string; transformedStart: number; transformedEnd: number } {
    let transformInfo = this.getTransformInfo(originalFileName);
    if (!transformInfo) {
      return {
        transformedFileName: originalFileName,
        transformedStart: originalStart,
        transformedEnd: originalEnd,
      };
    }

    let { transformedFileName, transformedModule } = transformInfo;
    let transformedRange = transformedModule.getTransformedRange(
      originalFileName,
      originalStart,
      originalEnd
    );

    return {
      transformedFileName,
      transformedStart: transformedRange.start,
      transformedEnd: transformedRange.end,
    };
  }

  public getOriginalRange(
    transformedFileName: string,
    transformedStart: number,
    transformedEnd: number
  ): { originalFileName: string; originalStart: number; originalEnd: number } {
    let transformInfo = this.getTransformInfo(transformedFileName);
    if (!transformInfo) {
      return {
        originalFileName: transformedFileName,
        originalStart: transformedStart,
        originalEnd: transformedEnd,
      };
    }

    let original = transformInfo.transformedModule.getOriginalRange(
      transformedStart,
      transformedEnd
    );

    return {
      originalFileName: original.source.filename,
      originalStart: original.start,
      originalEnd: original.end,
    };
  }

  public getTransformedOffset(
    originalFileName: string,
    originalOffset: number
  ): { transformedFileName: string; transformedOffset: number } {
    let transformInfo = this.getTransformInfo(originalFileName);
    if (!transformInfo) {
      return { transformedFileName: originalFileName, transformedOffset: originalOffset };
    }

    let { transformedFileName, transformedModule } = transformInfo;
    let transformedOffset = transformedModule.getTransformedOffset(
      originalFileName,
      originalOffset
    );

    return { transformedFileName, transformedOffset };
  }

  public watchTransformedFile = (
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

  public readTransformedFile = (filename: string, encoding?: string): string | undefined => {
    let existing = this.transformCache.get(filename);
    let version = this.documents.getCompoundDocumentVersion(filename);
    if (existing?.version === version) {
      return existing.transformedModule.transformedContents;
    }

    let contents = this.documents.getDocumentContents(filename, encoding);
    let config = this.glintConfig;

    if (
      contents &&
      filename.endsWith('.ts') &&
      !filename.endsWith('.d.ts') &&
      config.includesFile(filename)
    ) {
      let mayHaveTaggedTemplates = contents && config.environment.moduleMayHaveTagImports(contents);
      let templateCandidates = config.environment.getPossibleTemplatePaths(filename);
      let templatePath = templateCandidates.find((candidate) =>
        this.documents.documentExists(candidate)
      );

      if (!mayHaveTaggedTemplates && !templatePath) {
        return contents;
      }

      let script = { filename, contents };
      let template = templatePath
        ? { filename: templatePath, contents: this.documents.getDocumentContents(templatePath) }
        : undefined;

      let transformedModule = rewriteModule({ script, template }, config.environment);
      if (transformedModule) {
        this.transformCache.set(filename, { version, transformedModule });
        return transformedModule.transformedContents;
      }
    }

    return contents;
  };

  private getTransformInfo(
    originalFileName: string
  ): undefined | { transformedFileName: string; transformedModule: TransformedModule } {
    let transformedFileName = isTemplate(originalFileName)
      ? this.documents.getCompanionDocumentPath(originalFileName)
      : originalFileName;

    let transformInfo = transformedFileName
      ? this.transformCache.get(transformedFileName)
      : undefined;

    if (transformedFileName && transformInfo) {
      return { transformedFileName, transformedModule: transformInfo.transformedModule };
    }
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
