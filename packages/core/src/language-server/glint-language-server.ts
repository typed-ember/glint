import { GlintConfig } from '@glint/config';
import TransformManager from '../common/transform-manager';
import type ts from 'typescript';
import {
  offsetToPosition,
  filePathToUri,
  uriToFilePath,
  scriptElementKindToCompletionItemKind,
} from './util';
import { Hover, Location, CompletionItem, Diagnostic, MarkedString } from 'vscode-languageserver';
import DocumentCache, { isTemplate } from '../common/document-cache';
import { Position, positionToOffset } from './util/position';
import { severityForDiagnostic, tagsForDiagnostic } from './util/protocol';

export default class GlintLanguageServer {
  private service: ts.LanguageService;
  private transformManager: TransformManager;
  private documents: DocumentCache;

  constructor(
    private ts: typeof import('typescript'),
    private glintConfig: GlintConfig,
    getRootFileNames: () => Array<string>,
    options: ts.CompilerOptions
  ) {
    this.documents = new DocumentCache(ts, glintConfig);
    this.transformManager = new TransformManager(ts, glintConfig, this.documents);
    const serviceHost: ts.LanguageServiceHost = {
      getScriptFileNames: getRootFileNames,
      getScriptVersion: (fileName) => this.documents.getDocumentVersion(fileName),
      getScriptSnapshot: (fileName) => {
        let contents = this.transformManager.readTransformedFile(fileName);
        if (typeof contents === 'string') {
          return ts.ScriptSnapshot.fromString(contents);
        }
      },
      readFile: this.transformManager.readTransformedFile,
      getCompilationSettings: () => options,
      // Yes, this looks like a mismatch, but built-in lib declarations don't resolve
      // correctly otherwise, and this is what the TS wiki uses in their code snippet.
      getDefaultLibFileName: ts.getDefaultLibFilePath,
      // TS defaults from here down
      getCurrentDirectory: ts.sys.getCurrentDirectory,
      fileExists: ts.sys.fileExists,
      readDirectory: ts.sys.readDirectory,
      directoryExists: ts.sys.directoryExists,
      getDirectories: ts.sys.getDirectories,
    };

    this.service = ts.createLanguageService(serviceHost);

    // Kickstart typechecking
    this.service.getProgram();
  }

  public dispose(): void {
    this.service.dispose();
  }

  public openFile(uri: string, contents: string): void {
    this.documents.updateDocument(uriToFilePath(uri), contents);
  }

  public updateFile(uri: string, contents: string): void {
    this.documents.updateDocument(uriToFilePath(uri), contents);
  }

  public closeFile(uri: string): void {
    this.documents.removeDocument(uriToFilePath(uri));
  }

  public getDiagnostics(uri: string): Array<Diagnostic> {
    let filePath = uriToFilePath(uri);
    let sourcePath = this.findDiagnosticsSource(filePath);
    if (!sourcePath) return [];

    return [
      ...this.service.getSyntacticDiagnostics(sourcePath),
      ...this.transformManager.getTransformDiagnostics(sourcePath),
      ...this.service.getSemanticDiagnostics(sourcePath),
      ...this.service.getSuggestionDiagnostics(sourcePath),
    ].flatMap((transformedDiagnostic) => {
      let diagnostic = this.transformManager.rewriteDiagnostic(transformedDiagnostic);
      let { start = 0, length = 0, messageText, file } = diagnostic;
      if (!file || file.fileName !== filePath) return [];

      return {
        severity: severityForDiagnostic(diagnostic),
        message: this.ts.flattenDiagnosticMessageText(messageText, '\n'),
        source: `glint${diagnostic.code ? `:ts(${diagnostic.code})` : ''}`,
        tags: tagsForDiagnostic(diagnostic),
        range: {
          start: offsetToPosition(file.getText(), start),
          end: offsetToPosition(file.getText(), start + length),
        },
      };
    });
  }

  public getCompletions(uri: string, position: Position): CompletionItem[] | undefined {
    let { transformedFileName, transformedOffset } = this.getTransformedOffset(uri, position);
    let completions = this.service.getCompletionsAtPosition(
      transformedFileName,
      transformedOffset,
      {}
    );

    return completions?.entries.map((completionEntry) => ({
      label: completionEntry.name,
      kind: scriptElementKindToCompletionItemKind(completionEntry.kind),
      data: { transformedFileName, transformedOffset, source: completionEntry.source },
    }));
  }

  public getCompletionDetails(item: CompletionItem): CompletionItem {
    let { label, data } = item;
    if (!data) {
      return item;
    }

    let { transformedFileName, transformedOffset, source } = data;
    let details = this.service.getCompletionEntryDetails(
      transformedFileName,
      transformedOffset,
      label,
      {},
      source,
      {}
    );

    if (!details) {
      return item;
    }

    return {
      ...item,
      detail: this.ts.displayPartsToString(details.displayParts),
      documentation: {
        kind: 'markdown',
        value: this.ts.displayPartsToString(details.documentation),
      },
    };
  }

  public getHover(uri: string, position: Position): Hover | undefined {
    let { transformedFileName, transformedOffset } = this.getTransformedOffset(uri, position);
    let info = this.service.getQuickInfoAtPosition(transformedFileName, transformedOffset);
    if (!info) return;

    let value = this.ts.displayPartsToString(info.displayParts);
    let { originalFileName, originalStart, originalEnd } = this.transformManager.getOriginalRange(
      transformedFileName,
      info.textSpan.start,
      info.textSpan.start + info.textSpan.length
    );

    let originalContents = this.documents.getDocumentContents(originalFileName);
    let start = offsetToPosition(originalContents, originalStart);
    let end = offsetToPosition(originalContents, originalEnd);

    let contents: Array<MarkedString> = [{ language: 'ts', value }];
    if (info.documentation?.length) {
      contents.push(this.ts.displayPartsToString(info.documentation));
    }

    return { contents, range: { start, end } };
  }

  public getDefinition(uri: string, position: Position): Location[] {
    let { transformedFileName, transformedOffset } = this.getTransformedOffset(uri, position);
    let definitions =
      this.service.getDefinitionAtPosition(transformedFileName, transformedOffset) ?? [];

    return definitions.map(({ fileName, textSpan }) => {
      let { originalFileName, originalStart, originalEnd } = this.transformManager.getOriginalRange(
        fileName,
        textSpan.start,
        textSpan.start + textSpan.length
      );

      let originalContents = this.documents.getDocumentContents(originalFileName);
      let start = offsetToPosition(originalContents, originalStart);
      let end = offsetToPosition(originalContents, originalEnd);

      return Location.create(filePathToUri(originalFileName), { start, end });
    });
  }

  private findDiagnosticsSource(fileName: string): string | undefined {
    if (isTemplate(fileName) && this.glintConfig.includesFile(fileName)) {
      let scriptPaths = this.glintConfig.environment.getPossibleScriptPaths(fileName);
      return scriptPaths.find((candidate) => this.documents.documentExists(candidate));
    }

    return fileName;
  }

  private getTransformedOffset(
    originalURI: string,
    originalPosition: Position
  ): { transformedFileName: string; transformedOffset: number } {
    let originalFileName = uriToFilePath(originalURI);
    let originalFileContents = this.documents.getDocumentContents(originalFileName);
    let originalOffset = positionToOffset(originalFileContents, originalPosition);

    return this.transformManager.getTransformedOffset(originalFileName, originalOffset);
  }
}
