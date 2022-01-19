import {
  TransformedModule,
  rewriteModule,
  rewriteDiagnostic,
  Directive,
  Diagnostic,
  createTransformDiagnostic,
} from '@glint/transform';
import type ts from 'typescript';
import { GlintConfig } from '@glint/config';
import { assert } from '@glint/transform/lib/util';
import DocumentCache, { templatePathForSynthesizedModule } from './document-cache';

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

  public getTransformDiagnostics(fileName?: string): Array<Diagnostic> {
    if (fileName) {
      let transformedModule = this.getTransformInfo(fileName)?.transformedModule;
      return transformedModule ? this.buildTransformDiagnostics(transformedModule) : [];
    }

    return [...this.transformCache.values()].flatMap((transformInfo) => {
      if (transformInfo.transformedModule) {
        return this.buildTransformDiagnostics(transformInfo.transformedModule);
      }

      return [];
    });
  }

  public rewriteDiagnostics(
    diagnostics: ReadonlyArray<Diagnostic>,
    fileName?: string
  ): ReadonlyArray<ts.Diagnostic> {
    let unusedExpectErrors = new Set(this.getExpectErrorDirectives(fileName));
    let allDiagnostics = [];
    for (let diagnostic of diagnostics) {
      let { rewrittenDiagnostic, appliedDirective } = this.rewriteDiagnostic(diagnostic);
      if (rewrittenDiagnostic) {
        allDiagnostics.push(rewrittenDiagnostic);
      }

      if (appliedDirective?.kind === 'expect-error') {
        unusedExpectErrors.delete(appliedDirective);
      }
    }

    for (let directive of unusedExpectErrors) {
      allDiagnostics.push(
        createTransformDiagnostic(
          this.ts,
          directive.source,
          `Unused '@glint-expect-error' directive.`,
          directive.location
        )
      );
    }

    return this.ts.sortAndDeduplicateDiagnostics(allDiagnostics);
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
    let { documents } = this;
    if (!transformInfo?.transformedModule) {
      return {
        originalFileName: documents.getCanonicalDocumentPath(transformedFileName),
        originalStart: transformedStart,
        originalEnd: transformedEnd,
      };
    }

    let original = transformInfo.transformedModule.getOriginalRange(
      transformedStart,
      transformedEnd
    );

    return {
      originalFileName: documents.getCanonicalDocumentPath(original.source.filename),
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
      if (eventKind === this.ts.FileWatcherEventKind.Deleted) {
        this.documents.removeDocument(watchedPath);
      } else {
        this.documents.markDocumentStale(watchedPath);
      }

      return originalCallback(path, eventKind);
    };

    let rootWatcher = watchFile(path, callback, pollingInterval, options);
    let templatePaths = this.glintConfig.environment.getPossibleTemplatePaths(path);

    if (this.glintConfig.includesFile(path) && templatePaths.length) {
      let templateWatchers = templatePaths.map((candidate) =>
        watchFile(candidate.path, callback, pollingInterval, options)
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

  public readDirectory = (
    rootDir: string,
    extensions: ReadonlyArray<string>,
    excludes: ReadonlyArray<string> | undefined,
    includes: ReadonlyArray<string>,
    depth?: number | undefined
  ): Array<string> => {
    let allExtensions = [...extensions, TEMPLATE_EXTENSION];
    return this.ts.sys
      .readDirectory(rootDir, allExtensions, excludes, includes, depth)
      .map((filename) =>
        isTemplate(filename)
          ? synthesizedModulePathForTemplate(filename, this.glintConfig)
          : filename
      );
  };

  public readTransformedFile = (filename: string, encoding?: string): string | undefined => {
    let transformInfo = this.getTransformInfo(filename, encoding);
    if (transformInfo?.transformedModule) {
      return transformInfo.transformedModule.transformedContents;
    } else {
      return this.documents.getDocumentContents(filename, encoding);
    }
  };

  private getExpectErrorDirectives(filename?: string): Array<Directive> {
    let transformInfos = filename
      ? [this.getTransformInfo(filename)]
      : [...this.transformCache.values()];

    return transformInfos.flatMap((transformInfo) => {
      if (!transformInfo.transformedModule) return [];

      return transformInfo.transformedModule.directives.filter(
        (directive) => directive.kind === 'expect-error'
      );
    });
  }

  private rewriteDiagnostic(diagnostic: Diagnostic): {
    rewrittenDiagnostic?: ts.Diagnostic;
    appliedDirective?: Directive;
  } {
    if (!diagnostic.file) return {};

    // Transform diagnostics are already targeted at the original source and so
    // don't need to be rewritten.
    if ('isGlintTransformDiagnostic' in diagnostic && diagnostic.isGlintTransformDiagnostic) {
      return { rewrittenDiagnostic: diagnostic };
    }

    let transformInfo = this.getTransformInfo(diagnostic.file?.fileName);
    let rewrittenDiagnostic = rewriteDiagnostic(
      this.ts,
      diagnostic,
      (fileName) => this.getTransformInfo(fileName)?.transformedModule
    );

    if (rewrittenDiagnostic.file) {
      rewrittenDiagnostic.file.fileName = this.documents.getCanonicalDocumentPath(
        rewrittenDiagnostic.file.fileName
      );
    }

    let appliedDirective = transformInfo.transformedModule?.directives.find(
      (directive) =>
        directive.source.filename === rewrittenDiagnostic.file?.fileName &&
        directive.areaOfEffect.start <= rewrittenDiagnostic.start! &&
        directive.areaOfEffect.end > rewrittenDiagnostic.start!
    );

    // All current directives have the effect of squashing any diagnostics they apply
    // to, so if we have an applicable directive, we don't return the diagnostic.
    if (appliedDirective) {
      return { appliedDirective };
    } else {
      return { rewrittenDiagnostic };
    }
  }

  private findTransformInfoForOriginalFile(originalFileName: string): TransformInfo | null {
    let transformedFileName = this.glintConfig.environment.isTemplate(originalFileName)
      ? this.documents.getCompanionDocumentPath(originalFileName)
      : originalFileName;

    return transformedFileName ? this.getTransformInfo(transformedFileName) : null;
  }

  private getTransformInfo(filename: string, encoding?: string): TransformInfo {
    let { documents, glintConfig } = this;
    let { environment } = glintConfig;
    let documentID = documents.getDocumentID(filename);
    let existing = this.transformCache.get(documentID);
    let version = documents.getCompoundDocumentVersion(filename);
    if (existing?.version === version) {
      return existing;
    }

    let transformedModule: TransformedModule | null = null;
    if (environment.isScript(filename) && glintConfig.includesFile(filename)) {
      if (documents.documentExists(filename)) {
        let contents = documents.getDocumentContents(filename, encoding);
        let templatePath = documents.getCompanionDocumentPath(filename);
        let mayHaveEmbeds = environment.moduleMayHaveEmbeddedTemplates(filename, contents);

        if (mayHaveEmbeds || templatePath) {
          let script = { filename, contents };
          let template = templatePath
            ? {
                filename: templatePath,
                contents: documents.getDocumentContents(templatePath, encoding),
              }
            : undefined;

          transformedModule = rewriteModule({ script, template }, environment);
        }
      } else {
        let templatePath = templatePathForSynthesizedModule(filename);
        if (
          documents.documentExists(templatePath) &&
          documents.getCompanionDocumentPath(templatePath) === filename
        ) {
          // The script we were asked for doesn't exist, but a corresponding template does, and
          // it doesn't have a companion script elsewhere.
          let script = { filename, contents: '' };
          let template = {
            filename: templatePath,
            contents: documents.getDocumentContents(templatePath, encoding),
          };

          transformedModule = rewriteModule({ script, template }, glintConfig.environment);
        }
      }
    }

    let transformedFileName = glintConfig.getSynthesizedScriptPathForTS(filename);
    let cacheEntry = { version, transformedFileName, transformedModule };
    this.transformCache.set(documentID, cacheEntry);
    return cacheEntry;
  }

  private buildTransformDiagnostics(transformedModule: TransformedModule): Array<Diagnostic> {
    return transformedModule.errors.map((error) =>
      createTransformDiagnostic(this.ts, error.source, error.message, error.location)
    );
  }
}
