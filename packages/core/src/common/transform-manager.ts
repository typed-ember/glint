import { TransformedModule, rewriteModule, rewriteDiagnostic } from '@glint/transform';
import type ts from 'typescript';
import { GlintConfig } from '@glint/config';
import { assert } from '@glint/transform/lib/util';
import DocumentCache, { isTemplate } from './document-cache';

type TransformInfo = {
  version: string;
  transformedFileName: string;
  transformedModule: TransformedModule | null;
};

export default class TransformManager {
  private transformCache = new Map<string, TransformInfo>();

  constructor(
    private ts: typeof import('typescript'),
    private glintConfig: GlintConfig,
    private documents: DocumentCache = new DocumentCache(ts, glintConfig)
  ) {}

  public getTransformDiagnostics(fileName?: string): Array<ts.Diagnostic> {
    if (fileName) {
      let transformedModule = this.getTransformInfo(fileName)?.transformedModule;
      return transformedModule ? this.buildDiagnostics(transformedModule) : [];
    }

    return [...this.transformCache.values()].flatMap((transformInfo) => {
      if (transformInfo.transformedModule) {
        return this.buildDiagnostics(transformInfo.transformedModule);
      }

      return [];
    });
  }

  public rewriteDiagnostic(diagnostic: ts.Diagnostic): ts.Diagnostic {
    return rewriteDiagnostic(
      this.ts,
      diagnostic,
      (fileName) => this.getTransformInfo(fileName)?.transformedModule
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
    let transformInfo = this.findTransformInfoForOriginalFile(originalFileName);
    if (!transformInfo?.transformedModule) {
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
    if (!transformInfo?.transformedModule) {
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
    let transformInfo = this.findTransformInfoForOriginalFile(originalFileName);
    if (!transformInfo?.transformedModule) {
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
    originalCallback: ts.FileWatcherCallback,
    pollingInterval?: number,
    options?: ts.WatchOptions
  ): ts.FileWatcher => {
    const { watchFile } = this.ts.sys;
    assert(watchFile);

    let callback: ts.FileWatcherCallback = (watchedPath, eventKind) => {
      this.documents.markDocumentStale(watchedPath);
      return originalCallback(path, eventKind);
    };

    let rootWatcher = watchFile(path, callback, pollingInterval, options);
    let templatePaths = this.glintConfig.environment.getPossibleTemplatePaths(path);

    if (this.glintConfig.includesFile(path) && templatePaths.length) {
      let templateWatchers = templatePaths.map((candidate) =>
        watchFile(candidate, callback, pollingInterval, options)
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
    let transformInfo = this.getTransformInfo(filename, encoding);
    if (transformInfo?.transformedModule) {
      return transformInfo.transformedModule.transformedContents;
    } else {
      return this.documents.getDocumentContents(filename, encoding);
    }
  };

  private findTransformInfoForOriginalFile(originalFileName: string): TransformInfo | null {
    let transformedFileName = isTemplate(originalFileName)
      ? this.documents.getCompanionDocumentPath(originalFileName)
      : originalFileName;

    return transformedFileName ? this.getTransformInfo(transformedFileName) : null;
  }

  private getTransformInfo(filename: string, encoding?: string): TransformInfo {
    let existing = this.transformCache.get(filename);
    let version = this.documents.getCompoundDocumentVersion(filename);
    if (existing?.version === version) {
      return existing;
    }

    let transformedModule: TransformedModule | null = null;
    let contents = this.documents.getDocumentContents(filename, encoding);
    let config = this.glintConfig;

    if (
      contents &&
      filename.endsWith('.ts') &&
      !filename.endsWith('.d.ts') &&
      config.includesFile(filename)
    ) {
      let mayHaveTaggedTemplates = config.environment.moduleMayHaveTagImports(contents);
      let templateCandidates = config.environment.getPossibleTemplatePaths(filename);
      let templatePath = templateCandidates.find((candidate) =>
        this.documents.documentExists(candidate)
      );

      if (mayHaveTaggedTemplates || templatePath) {
        let script = { filename, contents };
        let template = templatePath
          ? { filename: templatePath, contents: this.documents.getDocumentContents(templatePath) }
          : undefined;

        transformedModule = rewriteModule({ script, template }, config.environment);
      }
    }

    let cacheEntry = { version, transformedFileName: filename, transformedModule };
    this.transformCache.set(filename, cacheEntry);
    return cacheEntry;
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
      messageText: error.message,
    }));
  }
}
