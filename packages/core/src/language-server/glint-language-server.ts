import { GlintConfig } from '@glint/config';
import TransformManager from '../common/transform-manager';
import type ts from 'typescript';
import {
  offsetToPosition,
  filePathToUri,
  uriToFilePath,
  scriptElementKindToCompletionItemKind,
} from './util';
import {
  Hover,
  Location,
  CompletionItem,
  Diagnostic,
  MarkedString,
  WorkspaceEdit,
  Range,
  SymbolInformation,
} from 'vscode-languageserver';
import DocumentCache, { isTemplate } from '../common/document-cache';
import { Position, positionToOffset } from './util/position';
import {
  scriptElementKindToSymbolKind,
  severityForDiagnostic,
  tagsForDiagnostic,
} from './util/protocol';
import { TextEdit } from 'vscode-languageserver-textdocument';

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
      readDirectory: this.transformManager.readDirectory,
      getCompilationSettings: () => options,
      // Yes, this looks like a mismatch, but built-in lib declarations don't resolve
      // correctly otherwise, and this is what the TS wiki uses in their code snippet.
      getDefaultLibFileName: ts.getDefaultLibFilePath,
      // TS defaults from here down
      getCurrentDirectory: ts.sys.getCurrentDirectory,
      fileExists: ts.sys.fileExists,
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

  public fileDidChange(uri: string): void {
    this.documents.markDocumentStale(uriToFilePath(uri));
  }

  public getDiagnostics(uri: string): Array<Diagnostic> {
    let filePath = uriToFilePath(uri);
    let sourcePath = this.findDiagnosticsSource(filePath);
    if (!sourcePath) return [];

    let diagnostics = [
      ...this.service.getSyntacticDiagnostics(sourcePath),
      ...this.transformManager.getTransformDiagnostics(sourcePath),
      ...this.service.getSemanticDiagnostics(sourcePath),
      ...this.service.getSuggestionDiagnostics(sourcePath),
    ];

    return this.transformManager
      .rewriteDiagnostics(diagnostics, sourcePath)
      .flatMap((diagnostic) => {
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

  public findSymbols(query: string): Array<SymbolInformation> {
    return this.service
      .getNavigateToItems(query)
      .map(({ name, kind, fileName, textSpan }) => {
        let location = this.textSpanToLocation(fileName, textSpan);
        if (location) {
          return { name, location, kind: scriptElementKindToSymbolKind(kind) };
        }
      })
      .filter((info): info is SymbolInformation => Boolean(info));
  }

  public getCompletions(uri: string, position: Position): CompletionItem[] | undefined {
    let { transformedFileName, transformedOffset } = this.getTransformedOffset(uri, position);
    if (isTemplate(transformedFileName)) return;

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
      {},
      // @ts-ignore: 4.3 adds a new not-optional-but-can-be-undefined `data` arg
      undefined
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

  public prepareRename(uri: string, position: Position): Range | undefined {
    let { transformedFileName, transformedOffset } = this.getTransformedOffset(uri, position);
    if (isTemplate(transformedFileName)) return;

    let rename = this.service.getRenameInfo(transformedFileName, transformedOffset);
    if (rename.canRename) {
      let { originalStart, originalEnd } = this.transformManager.getOriginalRange(
        transformedFileName,
        rename.triggerSpan.start,
        rename.triggerSpan.start + rename.triggerSpan.length
      );

      let contents = this.documents.getDocumentContents(uriToFilePath(uri));

      return {
        start: offsetToPosition(contents, originalStart),
        end: offsetToPosition(contents, originalEnd),
      };
    }
  }

  public getEditsForRename(uri: string, position: Position, newText: string): WorkspaceEdit {
    let { transformedFileName, transformedOffset } = this.getTransformedOffset(uri, position);
    if (isTemplate(transformedFileName)) return {};

    let renameLocations = this.service.findRenameLocations(
      transformedFileName,
      transformedOffset,
      false,
      false
    );

    if (!renameLocations?.length) {
      return {};
    }

    let changes: Record<string, TextEdit[]> = {};
    for (let { fileName, textSpan } of renameLocations) {
      let { originalFileName, originalStart, originalEnd } = this.transformManager.getOriginalRange(
        fileName,
        textSpan.start,
        textSpan.start + textSpan.length
      );

      if (originalStart === originalEnd) {
        // Zero-length spans correspond to synthetic use (such as in the context type
        // of the template, which references the containing class), so we want to filter
        // those out.
        continue;
      }

      let originalContents = this.documents.getDocumentContents(originalFileName);
      let originalFileURI = filePathToUri(originalFileName);
      let changesForFile = (changes[originalFileURI] ??= []);

      changesForFile.push({
        newText,
        range: {
          start: offsetToPosition(originalContents, originalStart),
          end: offsetToPosition(originalContents, originalEnd),
        },
      });
    }

    return { changes };
  }

  public getHover(uri: string, position: Position): Hover | undefined {
    let { transformedFileName, transformedOffset } = this.getTransformedOffset(uri, position);
    if (isTemplate(transformedFileName)) return;

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
    if (isTemplate(transformedFileName)) return [];

    let definitions =
      this.service.getDefinitionAtPosition(transformedFileName, transformedOffset) ?? [];

    return this.calculateOriginalLocations(definitions);
  }

  public getReferences(uri: string, position: Position): Location[] {
    let { transformedFileName, transformedOffset } = this.getTransformedOffset(uri, position);
    if (isTemplate(transformedFileName)) return [];

    let references =
      this.service.getReferencesAtPosition(transformedFileName, transformedOffset) ?? [];

    return this.calculateOriginalLocations(references);
  }

  private calculateOriginalLocations(spans: ReadonlyArray<ts.DocumentSpan>): Array<Location> {
    return spans
      .map((span) => this.textSpanToLocation(span.fileName, span.textSpan))
      .filter((loc): loc is Location => Boolean(loc));
  }

  private textSpanToLocation(fileName: string, textSpan: ts.TextSpan): Location | undefined {
    let { originalFileName, originalStart, originalEnd } = this.transformManager.getOriginalRange(
      fileName,
      textSpan.start,
      textSpan.start + textSpan.length
    );

    // If our calculated original span is zero-length but the transformed span
    // does take up space, this corresponds to a synthetic usage we generated
    // in the transformed output, and we don't want to show it to the user.
    if (originalStart === originalEnd && textSpan.length > 0) return;

    let originalContents = this.documents.getDocumentContents(originalFileName);
    let start = offsetToPosition(originalContents, originalStart);
    let end = offsetToPosition(originalContents, originalEnd);

    return Location.create(filePathToUri(originalFileName), { start, end });
  }

  private findDiagnosticsSource(fileName: string): string | undefined {
    if (!isTemplate(fileName)) {
      return fileName;
    }

    if (this.glintConfig.includesFile(fileName)) {
      return this.documents.getCompanionDocumentPath(fileName);
    }
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
