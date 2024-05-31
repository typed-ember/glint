import { GlintConfig } from '../config/index.js';
import TransformManager from '../common/transform-manager.js';
import type ts from 'typescript';
import {
  offsetToPosition,
  filePathToUri,
  uriToFilePath,
  scriptElementKindToCompletionItemKind,
} from './util/index.js';
import {
  Hover,
  Location,
  CompletionItem,
  Diagnostic,
  MarkedString,
  WorkspaceEdit,
  Range,
  SymbolInformation,
  CodeAction,
  CodeActionKind,
  TextDocumentEdit,
  OptionalVersionedTextDocumentIdentifier,
  TextEdit,
  MarkupContent,
} from '@volar/language-server';
import DocumentCache from '../common/document-cache.js';
import { Position, positionToOffset } from './util/position.js';
import {
  scriptElementKindToSymbolKind,
  severityForDiagnostic,
  tagsForDiagnostic,
} from './util/protocol.js';
import { GetIRResult } from './messages.cjs';
import MappingTree from '../transform/template/mapping-tree.js';
import { getTagDocumentation, plain } from './util/previewer.js';

export interface GlintCompletionItem extends CompletionItem {
  data: {
    uri: string;
    transformedFileName: string;
    transformedOffset: number;
    source: string | undefined;
    tsData: ts.CompletionEntryData | undefined;
  };
}

interface TransformedOffsets {
  transformedFileName: string;
  transformedStart: number;
  transformedEnd: number;
}

export default class GlintLanguageServer {
  readonly service: ts.LanguageService;
  private openFileNames: Set<string>;
  private rootFileNames: Set<string>;
  private ts: typeof import('typescript');

  constructor(
    private glintConfig: GlintConfig,
    private documents: DocumentCache,
    private transformManager: TransformManager
  ) {
    let parsedConfig = this.parseTsconfig(glintConfig, transformManager);

    this.ts = glintConfig.ts;
    this.openFileNames = new Set();
    this.rootFileNames = new Set(parsedConfig.fileNames);

    let exportMapCache = null;

    const ts = this.glintConfig.ts;

    let program: ts.Program | undefined;

    let serviceHost: ts.LanguageServiceHost = {
      getScriptFileNames: () => [...new Set(this.allKnownFileNames())],
      getScriptVersion: (fileName) => this.documents.getDocumentVersion(fileName),
      getScriptSnapshot: (fileName) => {
        let contents = this.transformManager.readTransformedFile(fileName);
        if (typeof contents === 'string') {
          return this.ts.ScriptSnapshot.fromString(contents);
        }
      },
      fileExists: this.transformManager.fileExists,
      readFile: this.transformManager.readTransformedFile,
      readDirectory: this.transformManager.readDirectory,
      // @ts-ignore: This hook was added in TS5, and is safely irrelevant in earlier versions. Once we drop support for 4.x, we can also remove this @ts-ignore comment.
      resolveModuleNameLiterals: this.transformManager.resolveModuleNameLiterals,
      getCompilationSettings: () => parsedConfig.options,
      // Yes, this looks like a mismatch, but built-in lib declarations don't resolve
      // correctly otherwise, and this is what the TS wiki uses in their code snippet.
      getDefaultLibFileName: this.ts.getDefaultLibFilePath,
      // TS defaults from here down
      getCurrentDirectory: this.ts.sys.getCurrentDirectory,
      directoryExists: this.ts.sys.directoryExists,
      getDirectories: this.ts.sys.getDirectories,
      realpath: this.ts.sys.realpath,

      // A proper choice for case sensitivity impacts things like resolving
      // relative paths for module specifiers for auto imports.
      useCaseSensitiveFileNames: () => this.ts.sys.useCaseSensitiveFileNames,

      // @ts-ignore Undocumented method.
      getCachedExportInfoMap() {
        // This hook is required so that when resolving a completion item, we can fetch export info
        // cached from the previous call to getCompletions. Without this, attempting to resolve a completion
        // item for exports that have at least 2 exports (due to re-exporting) will fail with an error.
        // See here for additional details on the ExportInfoMap.
        // https://github.com/microsoft/TypeScript/pull/52686

        // @ts-ignore This method does actually exist since 4.4+, but not sure why it's not in the types
        return (exportMapCache ||= ts.createCacheableExportInfoMap({
          getCurrentProgram: () => program,
          getPackageJsonAutoImportProvider: () => null,
          getGlobalTypingsCacheLocation: () => null,
        }));
      },

      // This can be temporarily uncommented when debugging the internal TS Language Server.
      // Logs will show up in the Debug Console. NOTE: don't change to console.log() because
      // it will interfere with transmitting messages back to the client.
      // log(message: string) {
      //   console.error(message);
      // },
    };

    this.service = this.ts.createLanguageService(serviceHost);

    // Kickstart typechecking
    program = this.service.getProgram();
  }

  public dispose(): void {
    this.service.dispose();
  }

  public openFile(uri: string, contents: string): void {
    let path = uriToFilePath(uri);
    this.documents.updateDocument(path, contents);
    this.openFileNames.add(this.transformManager.getScriptPathForTS(path));
  }

  public updateFile(uri: string, contents: string): void {
    this.documents.updateDocument(uriToFilePath(uri), contents);
  }

  public closeFile(uri: string): void {
    let path = uriToFilePath(uri);
    this.documents.removeDocument(path);
    this.openFileNames.delete(this.transformManager.getScriptPathForTS(path));
  }

  public watchedFileWasAdded(uri: string): void {
    let filePath = uriToFilePath(uri);
    if (filePath.startsWith(this.glintConfig.rootDir)) {
      this.rootFileNames.add(this.transformManager.getScriptPathForTS(filePath));
    }

    // Adding or removing a file invalidates most of what we think we know about module resolution.
    this.transformManager.moduleResolutionCache.clear();
  }

  public watchedFileDidChange(uri: string): void {
    this.documents.markDocumentStale(uriToFilePath(uri));
  }

  public watchedFileWasRemoved(uri: string): void {
    let path = uriToFilePath(uri);

    this.documents.markDocumentStale(path);

    // We need to be slightly careful here, because if `foo.ts` and `foo.hbs` both exist and
    // only one is deleted, we shouldn't remove their joint document from `rootFileNames`.
    let companionPath = this.documents.getCompanionDocumentPath(path);
    if (!companionPath || this.glintConfig.getSynthesizedScriptPathForTS(companionPath) !== path) {
      this.rootFileNames.delete(this.glintConfig.getSynthesizedScriptPathForTS(path));
    }

    // Adding or removing a file invalidates most of what we think we know about module resolution.
    this.transformManager.moduleResolutionCache.clear();
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
          source: 'glint',
          code: diagnostic.code,
          severity: severityForDiagnostic(this.ts, diagnostic),
          message: this.ts.flattenDiagnosticMessageText(messageText, '\n'),
          tags: tagsForDiagnostic(diagnostic),
          range: {
            start: offsetToPosition(file.text, start),
            end: offsetToPosition(file.text, start + length),
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
          return { name, location, kind: scriptElementKindToSymbolKind(this.ts, kind) };
        }
      })
      .filter((info): info is SymbolInformation => Boolean(info));
  }

  public getCompletions(
    uri: string,
    position: Position,
    formatting: ts.FormatCodeSettings = {},
    preferences: ts.UserPreferences = {}
  ): GlintCompletionItem[] | undefined {
    let { transformedFileName, transformedOffset, mapping } = this.getTransformedOffset(
      uri,
      position
    );

    if (!this.isAnalyzableFile(transformedFileName)) return;

    // If we're in a free-text region of a template, or if there's no mapping and yet
    // we're in a template file, then we have no completions to offer.
    if (
      mapping?.sourceNode.type === 'TextContent' ||
      mapping?.sourceNode.type === 'TemplateEmbedding' ||
      (!mapping && this.glintConfig.environment.isTemplate(uri))
    ) {
      return;
    }

    let completions = this.service.getCompletionsAtPosition(
      transformedFileName,
      transformedOffset,
      preferences,
      formatting
    );

    return completions?.entries.map((completionEntry) => {
      const glintCompletionItem: GlintCompletionItem = {
        label: completionEntry.name,
        preselect: completionEntry.isRecommended ? true : undefined,
        kind: scriptElementKindToCompletionItemKind(this.ts, completionEntry.kind),

        labelDetails: {
          // This displays the module specifier for auto-imports, e.g. "../../component" or "@glimmer/component"
          description: completionEntry.data?.moduleSpecifier,
        },

        // This data gets passed through to getCompletionDetails to fetch additional completion details
        data: {
          uri,
          transformedFileName,
          transformedOffset,
          source: completionEntry.source,
          tsData: completionEntry.data,
        },
        sortText: completionEntry.sortText,
      };

      return glintCompletionItem;
    });
  }

  public getCompletionDetails(
    item: GlintCompletionItem,
    formatting: ts.FormatCodeSettings = {},
    preferences: ts.UserPreferences = {}
  ): GlintCompletionItem {
    let { label, data } = item;
    if (!data) {
      return item;
    }

    let { transformedFileName, transformedOffset, source, tsData } = data;
    let details = this.service.getCompletionEntryDetails(
      transformedFileName,
      transformedOffset,
      label,
      formatting,
      source,
      preferences,
      tsData
    );

    if (!details) {
      return item;
    }

    item.detail = plain(this.ts.displayPartsToString(details.displayParts));
    const documentation: MarkupContent = {
      kind: 'markdown',
      value: '',
    };

    if (details.codeActions) {
      // CodeActions (such as auto-imports) need to be converted to TextEdits
      // that will be applied when the user selects the Completion.
      item.additionalTextEdits = this.convertCodeActionToTextEdit(
        transformedFileName,
        details.codeActions
      );

      details.codeActions.forEach((action) => {
        if (action.description) {
          // Prefix details, e.g. 'Add import from "@glimmer/component"'
          item.detail = `${action.description}\n\n${item.detail}`;
        }
      });
    }

    if (details?.documentation?.length) {
      documentation.value += this.ts.displayPartsToString(details.documentation) + '\n\n';
    }

    if (details.tags) {
      if (details.tags) {
        details.tags.forEach((x) => {
          const tagDoc = getTagDocumentation(x);
          if (tagDoc) {
            documentation.value += tagDoc + '\n\n';
          }
        });
      }
    }

    // Clean up any extra newlines
    documentation.value = documentation.value.replace(/\n+$/, '');
    item.detail = item.detail.replace(/\n+$/, '');

    return {
      ...item,
      documentation,
    };
  }

  private convertCodeActionToTextEdit(uri: string, codeActions: ts.CodeAction[]): TextEdit[] {
    const textEdits: TextEdit[] = [];

    for (const action of codeActions) {
      for (const change of action.changes) {
        for (const textChange of change.textChanges) {
          const location = this.textSpanToLocation(uri, textChange.span);

          if (location) {
            textEdits.push({
              range: location.range,
              newText: textChange.newText,
            });
          }
        }
      }
    }

    return textEdits;
  }

  public prepareRename(uri: string, position: Position): Range | undefined {
    let { transformedFileName, transformedOffset } = this.getTransformedOffset(uri, position);
    if (!this.isAnalyzableFile(transformedFileName)) return;

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
    if (!this.isAnalyzableFile(transformedFileName)) return {};

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
    if (!this.isAnalyzableFile(transformedFileName)) return;

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
    if (!this.isAnalyzableFile(transformedFileName)) return [];

    let definitions =
      this.service.getDefinitionAtPosition(transformedFileName, transformedOffset) ?? [];

    return this.calculateOriginalLocations(definitions);
  }

  public getReferences(uri: string, position: Position): Location[] {
    let { transformedFileName, transformedOffset } = this.getTransformedOffset(uri, position);
    if (!this.isAnalyzableFile(transformedFileName)) return [];

    let references =
      this.service.getReferencesAtPosition(transformedFileName, transformedOffset) ?? [];

    return this.calculateOriginalLocations(references);
  }

  public getOriginalContents(uri: string): string | undefined {
    let filePath = uriToFilePath(uri);
    return this.documents.getDocumentContents(filePath);
  }

  public getTransformedContents(uri: string): GetIRResult | undefined {
    let filePath = uriToFilePath(uri);
    let source = this.findDiagnosticsSource(filePath);
    if (!source) return;

    let contents = this.transformManager.readTransformedFile(source);
    if (contents) {
      let uri = filePathToUri(this.documents.getCanonicalDocumentPath(source));
      return { uri, contents };
    }
  }

  public getCodeActions(
    uri: string,
    actionKind: string,
    range: Range,
    diagnosticCodes: Diagnostic[],
    formatOptions: ts.FormatCodeSettings = {},
    preferences: ts.UserPreferences = {}
  ): CodeAction[] {
    // Only supports quickfixes right now but this can be expanded to support all of the
    // the different CodeActionKinds (Refactorings, Imports, etc).
    // @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#codeActionKind
    if (actionKind === CodeActionKind.QuickFix) {
      return this.applyCodeAction(uri, range, diagnosticCodes, formatOptions, preferences);
    }

    return [];
  }

  public organizeImports(
    uri: string,
    formatOptions: ts.FormatCodeSettings = {},
    preferences: ts.UserPreferences = {}
  ): TextEdit[] {
    const transformInfo = this.transformManager.findTransformInfoForOriginalFile(
      uriToFilePath(uri)
    );

    if (!transformInfo) {
      return [];
    }

    const fileTextChanges = this.service.organizeImports(
      {
        type: 'file',
        fileName: transformInfo.transformedFileName,
        skipDestructiveCodeActions: true,
      },
      formatOptions,
      preferences
    );
    const edits: TextEdit[] = [];

    for (const fileTextChange of fileTextChanges) {
      for (const textChange of fileTextChange.textChanges) {
        const location = this.textSpanToLocation(fileTextChange.fileName, textChange.span);
        if (location) {
          edits.push({
            range: location.range,
            newText: textChange.newText,
          });
        }
      }
    }

    return edits;
  }

  private applyCodeAction(
    uri: string,
    range: Range,
    diagnostics: Diagnostic[],
    formatting: ts.FormatCodeSettings = {},
    preferences: ts.UserPreferences = {}
  ): CodeAction[] {
    let errorCodes = this.filterDiagnosticCodes(diagnostics);

    let { transformedStart, transformedEnd, transformedFileName } =
      this.getTransformedOffsetsFromPositions(
        uri,
        {
          line: range.start.line,
          character: range.start.character,
        },
        {
          line: range.end.line,
          character: range.end.character,
        }
      );

    let codeFixes = this.service.getCodeFixesAtPosition(
      transformedFileName,
      transformedStart,
      transformedEnd,
      errorCodes,
      formatting,
      preferences
    );

    let codeActions = this.transformCodeFixActionToCodeAction(codeFixes, uri);

    return codeActions.filter((codeAction) =>
      codeAction.edit?.documentChanges?.every((change) => {
        if (TextDocumentEdit.is(change)) {
          return change.edits.length > 0;
        }
      })
    );
  }

  private filterDiagnosticCodes(diagnostics: Diagnostic[]): number[] {
    return diagnostics
      .map((diag) => {
        if (diag.code && diag.source?.startsWith('glint')) {
          return typeof diag.code === 'string' ? parseInt(diag.code) : diag.code;
        }

        return undefined;
      })
      .filter(onlyNumbers);
  }

  private transformCodeFixActionToCodeAction(
    codeFixes: readonly ts.CodeFixAction[],
    uri: string
  ): CodeAction[] {
    return codeFixes.map((fix) => {
      let documentChanges = fix.changes.map((change) => {
        let filePath = uriToFilePath(uri);
        let version = parseInt(this.documents.getDocumentVersion(filePath));

        let textChanges = change.textChanges.map((edit) => {
          let { originalEnd, originalFileName, originalStart, mapping } =
            this.transformManager.getOriginalRange(
              change.fileName,
              edit.span.start,
              edit.span.start + edit.span.length
            );

          let contents = this.documents.getDocumentContents(originalFileName);
          let start = offsetToPosition(contents, originalStart);
          let end = offsetToPosition(contents, originalEnd);

          // We need to re-write \@ts-ignore directives for embedded templates
          // Failing to do so would replace the problematics code with \@ts-ignore
          // instead of prepending it with \@glint-ignore.
          if (
            fix.fixName === 'disableJsDiagnostics' &&
            (this.glintConfig.environment.isTemplate(originalFileName) || mapping?.sourceNode)
          ) {
            return this.insertGlintIgnore(filePath, edit, start);
          }

          return TextEdit.replace(
            {
              start,
              end,
            },
            edit.newText
          );
        });

        let uriForEdit = uri;
        let companion = this.documents.getCompanionDocumentPath(filePath);
        if (companion && this.isFixForTS(filePath, fix.fixName)) {
          uriForEdit = filePathToUri(companion);
        }

        return TextDocumentEdit.create(
          OptionalVersionedTextDocumentIdentifier.create(uriForEdit, version),
          textChanges
        );
      });

      return CodeAction.create(fix.description, { documentChanges }, CodeActionKind.QuickFix);
    });
  }

  // This mimics what happens in TS/JS but for when we are in an embedded template context.
  // We fix up the indenting because this is the same behavior that occurs what inserting
  // \@ts-ignore checks
  private insertGlintIgnore(filePath: string, edit: ts.TextChange, start: Position): TextEdit {
    edit.newText = '{{! @glint-ignore }}\n';

    let linesOfNewText = edit.newText.split('\n');

    if (/^[ \t]*$/.test(linesOfNewText[linesOfNewText.length - 1])) {
      let contents = this.documents.getDocumentContents(filePath).split('\n')[start.line];
      let indent = /^[ |\t]+/.exec(contents)?.[0] ?? '';
      linesOfNewText[linesOfNewText.length - 1] = indent;
    }

    return TextEdit.insert(start, linesOfNewText.join('\n'));
  }

  private isFixForTS(filePath: string, fixName: string): boolean {
    return this.glintConfig.environment.isTemplate(filePath) && fixName !== 'disableJsDiagnostics';
  }

  private getTransformedOffsetsFromPositions(
    uri: string,
    startPosition: Position,
    endPosition: Position
  ): TransformedOffsets {
    let start = this.getTransformedOffset(uri, startPosition);
    let end = this.getTransformedOffset(uri, endPosition);

    return {
      transformedStart: start.transformedOffset,
      transformedEnd: end.transformedOffset,
      transformedFileName: start.transformedFileName,
    };
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
    let scriptPath = this.transformManager.getScriptPathForTS(fileName);

    if (this.isAnalyzableFile(scriptPath)) {
      return scriptPath;
    }
  }

  private getTransformedOffset(
    originalURI: string,
    originalPosition: Position
  ): { transformedFileName: string; transformedOffset: number; mapping?: MappingTree | undefined } {
    let originalFileName = uriToFilePath(originalURI);
    let originalFileContents = this.documents.getDocumentContents(originalFileName);
    let originalOffset = positionToOffset(originalFileContents, originalPosition);
    let { transformedStart, transformedFileName, mapping } =
      this.transformManager.getTransformedRange(originalFileName, originalOffset, originalOffset);

    return {
      mapping,
      transformedOffset: transformedStart,
      transformedFileName: this.glintConfig.getSynthesizedScriptPathForTS(transformedFileName),
    };
  }

  private isAnalyzableFile(synthesizedScriptPath: string): boolean {
    if (synthesizedScriptPath.endsWith('.ts')) {
      return true;
    }

    let allowJs = this.service.getProgram()?.getCompilerOptions().allowJs ?? false;
    if (allowJs && synthesizedScriptPath.endsWith('.js')) {
      return true;
    }

    return false;
  }

  private *allKnownFileNames(): Iterable<string> {
    let { environment } = this.glintConfig;

    for (let name of this.rootFileNames) {
      if (environment.isScript(name)) {
        yield name;
      }
    }

    for (let name of this.openFileNames) {
      if (environment.isScript(name)) {
        yield name;
      }
    }
  }

  private parseTsconfig(
    glintConfig: GlintConfig,
    transformManager: TransformManager
  ): ts.ParsedCommandLine {
    let { ts } = glintConfig;
    let contents = ts.readConfigFile(glintConfig.configPath, ts.sys.readFile).config;
    let host = { ...ts.sys, readDirectory: transformManager.readDirectory };

    return ts.parseJsonConfigFileContent(
      contents,
      host,
      glintConfig.rootDir,
      undefined,
      glintConfig.configPath
    );
  }
}

function onlyNumbers(entry: number | undefined): entry is number {
  return entry !== undefined;
}
