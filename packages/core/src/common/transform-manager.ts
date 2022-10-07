import { statSync as fsStatSync, Stats } from 'fs';
import {
  TransformedModule,
  rewriteModule,
  rewriteDiagnostic,
  Directive,
  Diagnostic,
  createTransformDiagnostic,
} from '@glint/transform';
import type * as ts from 'typescript';
import { GlintConfig } from '@glint/config';
import { assert } from '@glint/transform/lib/util';
import DocumentCache, { templatePathForSynthesizedModule } from './document-cache';
import MappingTree from '@glint/transform/src/template/mapping-tree';

type TransformInfo = {
  version: string;
  transformedFileName: string;
  transformedModule: TransformedModule | null;
};

export default class TransformManager {
  private transformCache = new Map<string, TransformInfo>();
  private readonly ts: typeof import('typescript');

  constructor(
    private glintConfig: GlintConfig,
    private documents: DocumentCache = new DocumentCache(glintConfig)
  ) {
    this.ts = glintConfig.ts;
  }

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
  ): {
    originalFileName: string;
    originalStart: number;
    originalEnd: number;
    mapping?: MappingTree;
  } {
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
      mapping: original.mapping,
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

    let { glintConfig, documents } = this;
    let callback: ts.FileWatcherCallback = (watchedPath, eventKind) => {
      if (eventKind === this.ts.FileWatcherEventKind.Deleted) {
        this.documents.removeDocument(watchedPath);
      } else {
        this.documents.markDocumentStale(watchedPath);
      }

      return originalCallback(path, eventKind);
    };

    if (!glintConfig.includesFile(path)) {
      return watchFile(path, callback, pollingInterval, options);
    }

    let allPaths = [
      ...glintConfig.environment.getPossibleTemplatePaths(path).map((candidate) => candidate.path),
      ...documents.getCandidateDocumentPaths(path),
    ];

    let allWatchers = allPaths.map((candidate) =>
      watchFile(candidate, callback, pollingInterval, options)
    );

    return {
      close() {
        allWatchers.forEach((watcher) => watcher.close());
      },
    };
  };

  public watchDirectory = (
    path: string,
    originalCallback: ts.DirectoryWatcherCallback,
    recursive?: boolean,
    options?: ts.WatchOptions
  ): ts.FileWatcher => {
    assert(this.ts.sys.watchDirectory);

    let callback: ts.DirectoryWatcherCallback = (filename) =>
      originalCallback(this.glintConfig.getSynthesizedScriptPathForTS(filename));

    return this.ts.sys.watchDirectory(path, callback, recursive, options);
  };

  public readDirectory = (
    rootDir: string,
    extensions: ReadonlyArray<string>,
    excludes: ReadonlyArray<string> | undefined,
    includes: ReadonlyArray<string>,
    depth?: number | undefined
  ): Array<string> => {
    let env = this.glintConfig.environment;
    let allExtensions = [...new Set([...extensions, ...env.getConfiguredFileExtensions()])];
    return this.ts.sys
      .readDirectory(rootDir, allExtensions, excludes, includes, depth)
      .map((filename) => this.glintConfig.getSynthesizedScriptPathForTS(filename));
  };

  public fileExists = (filename: string): boolean => {
    return this.documents.documentExists(filename);
  };

  public readTransformedFile = (filename: string, encoding?: string): string | undefined => {
    let transformInfo = this.getTransformInfo(filename, encoding);
    if (transformInfo?.transformedModule) {
      return transformInfo.transformedModule.transformedContents;
    } else {
      return this.documents.getDocumentContents(filename, encoding);
    }
  };

  public getModifiedTime = (filename: string): Date | undefined => {
    let fileStat = statSync(filename);
    if (!fileStat) return undefined;

    let companionPath = this.documents.getCompanionDocumentPath(filename);
    if (!companionPath) return fileStat.mtime;

    let companionStat = statSync(companionPath);
    if (!companionStat) return fileStat.mtime;

    return fileStat.mtime > companionStat.mtime ? fileStat.mtime : companionStat.mtime;
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
        let canonicalPath = documents.getCanonicalDocumentPath(filename);
        let mayHaveEmbeds = environment.moduleMayHaveEmbeddedTemplates(canonicalPath, contents);

        if (mayHaveEmbeds || templatePath) {
          let script = { filename: canonicalPath, contents };
          let template = templatePath
            ? {
                filename: templatePath,
                contents: documents.getDocumentContents(templatePath, encoding),
              }
            : undefined;

          transformedModule = rewriteModule(this.ts, { script, template }, environment);
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

          transformedModule = rewriteModule(this.ts, { script, template }, glintConfig.environment);
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

function statSync(path: string): Stats | undefined {
  try {
    return fsStatSync(path);
  } catch (e) {
    if (e instanceof Error && (e as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined;
    }

    throw e;
  }
}
