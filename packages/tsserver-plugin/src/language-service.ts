import type ts from 'typescript/lib/tsserverlibrary';
import { TransformedModule, rewriteDiagnostic } from '@glint/transform';
import VirtualModuleManager from './virtual-module-manager';
import { loggerFor, Logger } from './util/logging';
import {
  TransformedPath,
  TransformablePath,
  isTransformablePath,
  isTransformedPath,
  getTransformedPath,
  getOriginalPath,
  isExtensionlessTransformedPath,
  getExtensionlessOriginalPath,
} from './util/path-transformation';

type TransformInfo = {
  transformedModule: TransformedModule;
  transformedPath: TransformedPath;
  transformedSourceFile: ts.SourceFile;
  originalPath: TransformablePath;
};

export default class GlintLanguageService implements Partial<ts.LanguageService> {
  private readonly ls: ts.LanguageService;
  private readonly logger: Logger;

  public constructor(
    private readonly ts: typeof import('typescript/lib/tsserverlibrary'),
    private readonly modules: VirtualModuleManager,
    info: ts.server.PluginCreateInfo
  ) {
    this.ls = info.languageService;
    this.logger = loggerFor(info);
  }

  private getTransformInfoForOriginalPath(originalPath: string): TransformInfo | undefined {
    if (isTransformablePath(originalPath)) {
      return this.getTransformInfo(originalPath, getTransformedPath(originalPath));
    }
  }

  private getTransformInfoForTransformedPath(transformedPath: string): TransformInfo | undefined {
    if (isTransformedPath(transformedPath)) {
      return this.getTransformInfo(getOriginalPath(transformedPath), transformedPath);
    }
  }

  private getTransformInfo(
    originalPath: TransformablePath,
    transformedPath: TransformedPath
  ): TransformInfo | undefined {
    let transformedModule = this.modules.getTransformedModule(originalPath);
    let transformedSourceFile = this.ls.getProgram()?.getSourceFile(transformedPath);

    if (transformedModule && transformedSourceFile) {
      return { transformedModule, transformedPath, transformedSourceFile, originalPath };
    }
  }

  public getSyntacticDiagnostics(fileName: string): ts.DiagnosticWithLocation[] {
    let info = this.getTransformInfoForOriginalPath(fileName);
    let transformationErrors = info?.transformedModule?.errors ?? [];
    let originalSourceFile = this.ls.getProgram()?.getSourceFile(fileName)!;

    return [
      ...this.ls.getSyntacticDiagnostics(fileName),
      ...transformationErrors.map((error) => ({
        category: this.ts.DiagnosticCategory.Error,
        code: 0,
        file: originalSourceFile,
        start: error.location.start,
        length: error.location.end - error.location.start,
        messageText: `[glint] ${error.message}`,
      })),
    ];
  }

  public getSemanticDiagnostics(fileName: string): ts.Diagnostic[] {
    const info = this.getTransformInfoForOriginalPath(fileName);
    if (info) {
      return this.ls
        .getSemanticDiagnostics(info.transformedPath)
        .map((diagnostic) => rewriteDiagnostic(this.ts, diagnostic, info.transformedModule));
    }

    return this.ls.getSemanticDiagnostics(fileName);
  }

  public getSuggestionDiagnostics(fileName: string): ts.DiagnosticWithLocation[] {
    const info = this.getTransformInfoForOriginalPath(fileName);
    if (info) {
      return this.ls
        .getSuggestionDiagnostics(info.transformedPath)
        .map((diagnostic) => rewriteDiagnostic(this.ts, diagnostic, info.transformedModule));
    }

    return this.ls.getSuggestionDiagnostics(fileName);
  }

  public getEncodedSyntacticClassifications(
    fileName: string,
    span: ts.TextSpan
  ): ts.Classifications {
    return this.ls.getEncodedSyntacticClassifications(fileName, span);
  }

  public getEncodedSemanticClassifications(
    fileName: string,
    span: ts.TextSpan
  ): ts.Classifications {
    return this.ls.getEncodedSemanticClassifications(fileName, span);
  }

  // Completions are only available in a small number of scenarios right now,
  // because @glimmer/syntax has no error recovery/lax mode, and most of the
  // time when you want a completion, you're not looking at valid template syntax.
  // It _is_ useful for suggestion component args, though, and within a mustache
  // or self-closing tag where you've _started_ typing, it can complete for you
  // (though it's rare that you have perfect surrounding syntax in that scenario)
  public getCompletionsAtPosition(
    fileName: string,
    offset: number,
    options: ts.GetCompletionsAtPositionOptions | undefined
  ): ts.WithMetadata<ts.CompletionInfo> | undefined {
    let info = this.getTransformInfoForOriginalPath(fileName);
    let result: ts.WithMetadata<ts.CompletionInfo> | undefined;
    if (info) {
      let range = info.transformedModule.getTransformedRange(info.originalPath, offset, offset);

      // If we're within a freeform text area in the template, don't attempt to autocomplete at all
      let containingNode = range.mapping?.sourceNode;
      if (
        containingNode &&
        ['Template', 'Block', 'StringLiteral', 'ElementNode'].includes(containingNode.type)
      ) {
        return;
      }

      result = this.ls.getCompletionsAtPosition(info.transformedPath, range.start, options);
    } else {
      result = this.ls.getCompletionsAtPosition(fileName, offset, options);
    }

    if (!result) return;

    result = { ...result };

    // Never show completions from transformed files
    result.entries = result.entries.filter(
      (entry) => !entry.source || !isExtensionlessTransformedPath(entry.source)
    );

    if (info) {
      result.entries = result.entries.map((entry) => {
        if (entry.replacementSpan) {
          entry = { ...entry };
          entry.replacementSpan = rewriteTextSpan(entry.replacementSpan, info!.transformedModule);
        }

        return entry;
      });
    }

    return result;
  }

  public getCompletionEntryDetails(
    fileName: string,
    offset: number,
    name: string,
    formatOptions: ts.FormatCodeOptions | ts.FormatCodeSettings | undefined,
    source: string | undefined,
    preferences: ts.UserPreferences | undefined
  ): ts.CompletionEntryDetails | undefined {
    let info = this.getTransformInfoForOriginalPath(fileName);
    if (info) {
      let transformedOffset = info.transformedModule.getTransformedOffset(
        info.originalPath,
        offset
      );
      let details = this.ls.getCompletionEntryDetails(
        info.transformedPath,
        transformedOffset,
        name,
        formatOptions,
        source,
        preferences
      );

      if (details?.codeActions) {
        details = {
          ...details,
          codeActions: details.codeActions?.map((action) => this.rewriteCodeAction(action)),
        };
      }

      return details;
    }

    return this.ls.getCompletionEntryDetails(
      fileName,
      offset,
      name,
      formatOptions,
      source,
      preferences
    );
  }

  public getCompletionEntrySymbol(
    fileName: string,
    offset: number,
    name: string,
    source: string | undefined
  ): ts.Symbol | undefined {
    let info = this.getTransformInfoForOriginalPath(fileName);
    if (info) {
      let transformedOffset = info.transformedModule.getTransformedOffset(
        info.originalPath,
        offset
      );
      return this.ls.getCompletionEntrySymbol(
        info.transformedPath,
        transformedOffset,
        name,
        source
      );
    }

    return this.ls.getCompletionEntrySymbol(fileName, offset, name, source);
  }

  public getQuickInfoAtPosition(fileName: string, offset: number): ts.QuickInfo | undefined {
    let info = this.getTransformInfoForOriginalPath(fileName);
    let quickInfo: ts.QuickInfo | undefined;
    if (info) {
      let transformedOffset = info.transformedModule.getTransformedOffset(
        info.originalPath,
        offset
      );
      quickInfo = this.ls.getQuickInfoAtPosition(info.transformedPath, transformedOffset);

      if (quickInfo) {
        quickInfo = { ...quickInfo };
        quickInfo.textSpan = rewriteTextSpan(quickInfo.textSpan, info.transformedModule);
      }
    } else {
      quickInfo = this.ls.getQuickInfoAtPosition(fileName, offset);
    }

    if (quickInfo?.kind === 'module') {
      // Ensures we display the non-transformed version of the resolved module
      // path when getting quick info for an import source.
      quickInfo.displayParts = quickInfo.displayParts?.map((part) => {
        if (part.kind === 'stringLiteral') {
          return {
            kind: 'stringLiteral',
            text: rewriteQuotedModulePath(part.text),
          };
        }

        return part;
      });
    }

    return quickInfo;
  }

  public getRenameInfo(
    fileName: string,
    offset: number,
    options?: ts.RenameInfoOptions | undefined
  ): ts.RenameInfo {
    let info = this.getTransformInfoForOriginalPath(fileName);
    if (info) {
      let transformedOffset = info.transformedModule.getTransformedOffset(
        info.originalPath,
        offset
      );
      let result = this.ls.getRenameInfo(info.transformedPath, transformedOffset, options);
      if (result.canRename) {
        result.triggerSpan = rewriteTextSpan(result.triggerSpan, info.transformedModule);
      }
      return result;
    }

    return this.ls.getRenameInfo(fileName, offset, options);
  }

  public findRenameLocations(
    fileName: string,
    offset: number,
    findInStrings: boolean,
    findInComments: boolean,
    providePrefixAndSuffixTextForRename?: boolean | undefined
  ): readonly ts.RenameLocation[] | undefined {
    let result = this.flatMapDefinitions(fileName, offset, (fileName, offset) => {
      return this.ls.findRenameLocations(
        fileName,
        offset,
        findInStrings,
        findInComments,
        providePrefixAndSuffixTextForRename
      );
    });

    return result
      ?.map((renameLocation) => {
        renameLocation = this.rewriteDocumentSpan(renameLocation);

        // Zero-length spans correspond to synthetic use (such as in the context type
        // of the template, which references the containing class), so we want to filter
        // those out.
        if (!renameLocation.textSpan.length) {
          return;
        }

        return renameLocation;
      })
      .filter((renameLocation): renameLocation is ts.RenameLocation => !!renameLocation);
  }

  // When we have a definition in module that's subject to transformation, we ultimately
  // wind up with two definitions: one from the original (which all other modules see)
  // and one in the transformed version, which is what references within the transformed
  // module will resolve to. For things like reference resolution and symbol renames, we
  // want to make sure we cover references to both definitions,
  private flatMapDefinitions<T>(
    fileName: string,
    offset: number,
    callback: (fileName: string, offset: number) => ReadonlyArray<T> | undefined
  ): Array<T> {
    let results: Array<T> = [];
    let def = this.getDefinitionAtPosition(fileName, offset)?.[0];
    if (!def) return results;

    results.push(...(callback(def.fileName, def.textSpan.start) ?? []));

    if (isTransformablePath(def.fileName)) {
      let info = this.getTransformInfoForOriginalPath(def.fileName);
      if (info) {
        let transformedOffset = info.transformedModule.getTransformedOffset(
          info.originalPath,
          def.textSpan.start
        );
        let result = callback(info.transformedPath, transformedOffset) ?? [];
        results.push(...result);
      }
    } else if (isTransformedPath(def.fileName)) {
      let info = this.getTransformInfoForTransformedPath(def.fileName);
      if (info) {
        let original = info.transformedModule.getOriginalOffset(def.textSpan.start);
        let result = callback(info.originalPath, original.offset) ?? [];
        results.push(...result);
      }
    }

    return results;
  }

  public getEditsForFileRename(
    oldFilePath: string,
    newFilePath: string,
    formatOptions: ts.FormatCodeSettings,
    preferences: ts.UserPreferences | undefined
  ): readonly ts.FileTextChanges[] {
    let edits = this.ls.getEditsForFileRename(oldFilePath, newFilePath, formatOptions, preferences);

    return edits.filter((edit) => !isTransformedPath(edit.fileName));
  }

  public getDefinitionAtPosition(
    fileName: string,
    offset: number
  ): readonly ts.DefinitionInfo[] | undefined {
    let info = this.getTransformInfoForOriginalPath(fileName);
    let result: readonly ts.DefinitionInfo[] | undefined;
    if (info) {
      let transformedPosition =
        info.transformedModule.getTransformedOffset(info.originalPath, offset) + 1;
      result = this.ls.getDefinitionAtPosition(info.transformedPath, transformedPosition);
    } else {
      result = this.ls.getDefinitionAtPosition(fileName, offset);
    }

    result = result?.map((entry) => this.rewriteDefinition(entry));

    return result;
  }

  public getDefinitionAndBoundSpan(
    fileName: string,
    offset: number
  ): ts.DefinitionInfoAndBoundSpan | undefined {
    let info = this.getTransformInfoForOriginalPath(fileName);
    let result: ts.DefinitionInfoAndBoundSpan | undefined;
    if (info) {
      let transformedOffset = info.transformedModule.getTransformedOffset(
        info.originalPath,
        offset
      );
      result = this.ls.getDefinitionAndBoundSpan(info.transformedPath, transformedOffset);
    } else {
      result = this.ls.getDefinitionAndBoundSpan(fileName, offset);
    }

    if (result) {
      result = { ...result };
      result.definitions = result.definitions?.map((def) => this.rewriteDefinition(def));

      if (info) {
        result.textSpan = rewriteTextSpan(result.textSpan, info.transformedModule);
      }
    }

    return result;
  }

  public getReferencesAtPosition(
    fileName: string,
    offset: number
  ): ts.ReferenceEntry[] | undefined {
    return this.flatMapDefinitions(fileName, offset, (fileName, offset) => {
      let referenceEntries = this.ls.getReferencesAtPosition(fileName, offset);
      if (referenceEntries) {
        return this.rewriteReferenceEntries(referenceEntries);
      }
    });
  }

  public findReferences(fileName: string, offset: number): ts.ReferencedSymbol[] | undefined {
    return this.flatMapDefinitions(fileName, offset, (fileName, offset) => {
      return this.ls.findReferences(fileName, offset);
    }).map((ref) => {
      ref = { ...ref };
      ref.references = this.rewriteReferenceEntries(ref.references);
      ref.definition = this.rewriteDefinition(ref.definition);
      return ref;
    });
  }

  public getNavigateToItems(
    searchValue: string,
    maxResultCount?: number,
    fileName?: string,
    excludeDtsFiles?: boolean
  ): Array<ts.NavigateToItem> {
    let items = this.ls.getNavigateToItems(
      searchValue,
      maxResultCount ? 2 * maxResultCount : undefined,
      fileName,
      excludeDtsFiles
    );

    items = items.filter((item) => !isTransformedPath(item.fileName));

    if (maxResultCount) {
      items = items.slice(0, maxResultCount);
    }

    return items;
  }

  private rewriteDefinition<T extends ts.DefinitionInfo>(def: T): T {
    let rewritten = this.rewriteDocumentSpan(def);
    if (rewritten.kind === 'module') {
      rewritten.name = rewriteQuotedModulePath(rewritten.name);
    }
    return rewritten;
  }

  private rewriteReferenceEntries(entries: Array<ts.ReferenceEntry>): Array<ts.ReferenceEntry> {
    let referenceFiles = new Set(entries.map((ref) => ref.fileName));
    return entries
      .filter((ref) => {
        // If we have references in both the transformed and untransformed version
        // of a file, exclude any from the original, since that means the transformed
        // module has at _least_ those references and possibly more.
        return !(
          isTransformablePath(ref.fileName) && referenceFiles.has(getTransformedPath(ref.fileName))
        );
      })
      .map((ref) => this.rewriteDocumentSpan(ref))
      .filter((ref) => {
        // Any 0-length references are synthetic, and should be excluded
        return ref.textSpan.length > 0;
      });
  }

  private rewriteDocumentSpan<T extends ts.DocumentSpan>(documentSpan: T): T {
    let { fileName } = documentSpan;

    if (isTransformedPath(fileName)) {
      documentSpan = { ...documentSpan };
      documentSpan.fileName = getOriginalPath(fileName);
    }

    let info = this.getTransformInfoForTransformedPath(fileName);
    if (!info) return documentSpan;

    documentSpan.textSpan = rewriteTextSpan(documentSpan.textSpan, info.transformedModule);

    if (documentSpan.contextSpan) {
      documentSpan.contextSpan = rewriteTextSpan(documentSpan.contextSpan, info.transformedModule);
    }

    return documentSpan;
  }

  private rewriteCodeAction(action: ts.CodeAction): ts.CodeAction {
    return {
      ...action,
      changes: action.changes.map((change) => {
        change = { ...change };

        if (isTransformedPath(change.fileName)) {
          const changeInfo = this.getTransformInfoForTransformedPath(change.fileName);
          if (changeInfo) {
            change.fileName = changeInfo.originalPath;
            change.textChanges = change.textChanges.map((textChange) => {
              return {
                ...textChange,
                span: rewriteTextSpan(textChange.span, changeInfo.transformedModule),
              };
            });
          }
        }

        return change;
      }),
    };
  }
}

function rewriteTextSpan(span: ts.TextSpan, module: TransformedModule): ts.TextSpan;
function rewriteTextSpan(
  span: ts.TextSpan | undefined,
  module: TransformedModule
): ts.TextSpan | undefined;
function rewriteTextSpan(
  span: ts.TextSpan | undefined,
  module: TransformedModule
): ts.TextSpan | undefined {
  if (!span) return;

  let originalRange = module.getOriginalRange(span.start, span.start + span.length);

  return {
    start: originalRange.start,
    length: originalRange.end - originalRange.start,
  };
}

function rewriteQuotedModulePath(stringLiteral: string): string {
  let text = JSON.parse(stringLiteral) as string;
  if (isExtensionlessTransformedPath(text)) {
    return `"${getExtensionlessOriginalPath(text)}"`;
  }
  return stringLiteral;
}
