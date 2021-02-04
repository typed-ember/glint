import * as fs from 'fs';
import { GlintConfig } from '@glint/config';
import TransformManager from './transform-manager';
import type ts from 'typescript';
import { positionTolineAndCharacter, filePathToUri } from './util';
import { Range, Hover, Location, LocationLink } from 'vscode-languageserver';

export default class GlimmerLanguageServer {
  service: ts.LanguageService;
  files: ts.MapLike<{ version: number }> = {};
  private transformManager: TransformManager;

  constructor(
    private ts: typeof import('typescript'),
    glintConfig: GlintConfig,
    rootFileNames: string[],
    options: ts.CompilerOptions
  ) {
    this.transformManager = new TransformManager(ts, glintConfig);

    rootFileNames.forEach((fileName) => {
      this.files[fileName] = { version: 0 };
    });

    const serviceHost: ts.LanguageServiceHost = {
      getScriptFileNames: () => rootFileNames,
      getScriptVersion: (fileName) =>
        this.files[fileName] && this.files[fileName].version.toString(),
      getScriptSnapshot: (fileName) => {
        if (!fs.existsSync(fileName)) {
          return undefined;
        }
        let contents = this.transformManager.readFile(fileName) ?? '';
        return ts.ScriptSnapshot.fromString(contents);
      },
      getCurrentDirectory: () => process.cwd(),
      getCompilationSettings: () => options,
      getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
      fileExists: ts.sys.fileExists,
      readFile: this.transformManager.readFile,
      readDirectory: ts.sys.readDirectory,
      directoryExists: ts.sys.directoryExists,
      getDirectories: ts.sys.getDirectories,
    };

    this.service = ts.createLanguageService(serviceHost, ts.createDocumentRegistry());
    // trigger file reads
    this.service.getProgram();
  }

  logErrors(fileName: string): void {
    const allDiagnostics = this.getDiagnostics(fileName);

    allDiagnostics.forEach((diagnostic) => {
      let message = this.ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
      if (diagnostic.file) {
        let { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
        console.log(
          `  Error ${diagnostic.file.fileName} [${diagnostic.start!}] (${line + 1},${
            character + 1
          }): ${message}`
        );
      } else {
        console.log(`  Error: ${message}`);
      }
    });
  }

  updateTemplate(templateFileName: string, contents: string): void {
    const tsFile = this.transformManager.getTemplateTsFile(templateFileName);
    if (!tsFile) {
      return;
    }
    this.transformManager.setTemplateContents(templateFileName, contents);
    this.files[tsFile].version++;
  }

  getTemplateDiagnostics(templateFileName: string): Array<ts.Diagnostic> {
    const tsFile = this.transformManager.getTemplateTsFile(templateFileName);
    if (!tsFile) {
      return [];
    }
    const results = this.getDiagnostics(tsFile);

    return results.filter((result) => result?.file?.fileName === templateFileName);
  }

  getDiagnostics(fileName: string): Array<ts.Diagnostic> {
    const allDiagnostics = this.service
      .getCompilerOptionsDiagnostics()
      .concat(this.service.getSyntacticDiagnostics(fileName))
      .concat(this.service.getSemanticDiagnostics(fileName))
      .concat(this.transformManager.getTransformDiagnostics(fileName));

    return allDiagnostics.map((diagnostic) =>
      this.transformManager.getTransformedDiagnostic(diagnostic)
    );
  }

  getCompletions(
    templateFileName: string,
    line: number,
    character: number
  ): ts.WithMetadata<ts.CompletionInfo> | undefined {
    const tsFileName = this.transformManager.getTemplateTsFile(templateFileName);
    if (!tsFileName) {
      return;
    }
    const position = this.transformManager.getTemplateTsFilePos(templateFileName, line, character);
    if (typeof position !== 'number') {
      return;
    }
    const options = {};
    const completions = this.service.getCompletionsAtPosition(tsFileName, position, options);
    return completions;
  }

  getCompletionDetails(
    templateFileName: string,
    line: number,
    character: number,
    entryName: string,
    source?: string
  ): { detail: string; documentation: string } | undefined {
    const tsFileName = this.transformManager.getTemplateTsFile(templateFileName);
    if (!tsFileName) {
      return;
    }
    const position = this.transformManager.getTemplateTsFilePos(templateFileName, line, character);
    if (typeof position !== 'number') {
      return;
    }
    const formatOptions: ts.FormatCodeOptions | ts.FormatCodeSettings = {};
    const preferences: ts.UserPreferences = {
      importModuleSpecifierEnding: 'minimal',
      importModuleSpecifierPreference: 'relative',
      includeCompletionsWithInsertText: true,
    };
    const details = this.service.getCompletionEntryDetails(
      tsFileName,
      position,
      entryName,
      formatOptions,
      source,
      preferences
    );
    if (!details) {
      return;
    }
    return {
      detail: this.ts.displayPartsToString(details.displayParts),
      documentation: this.ts.displayPartsToString(details.documentation),
    };
  }

  getHover(templateFileName: string, line: number, character: number): Hover | undefined {
    const tsFileName = this.transformManager.getTemplateTsFile(templateFileName);
    if (!tsFileName) {
      return;
    }
    const position = this.transformManager.getTemplateTsFilePos(templateFileName, line, character);
    if (typeof position !== 'number') {
      return;
    }
    const info = this.service.getQuickInfoAtPosition(tsFileName, position);
    if (!info) {
      return;
    }
    const value = this.ts.displayPartsToString(info.displayParts);
    const posRange = this.transformManager.getTsFileTemplateRange(tsFileName, info.textSpan);
    if (!posRange) {
      return;
    }
    const contents = this.transformManager.getTemplateContents(templateFileName);
    if (!contents) {
      return;
    }
    const range: Range = {
      start: positionTolineAndCharacter(contents, posRange.start),
      end: positionTolineAndCharacter(contents, posRange.end),
    };
    return {
      contents: {
        language: 'ts',
        value,
      },
      range,
    };
  }

  getDefinition(
    templateFileName: string,
    line: number,
    character: number
  ): Location | Location[] | LocationLink[] | null | undefined {
    const tsFileName = this.transformManager.getTemplateTsFile(templateFileName);
    if (!tsFileName) {
      return;
    }
    const position = this.transformManager.getTemplateTsFilePos(templateFileName, line, character);
    if (typeof position !== 'number') {
      return;
    }
    const definition = this.service.getDefinitionAndBoundSpan(tsFileName, position);
    if (!definition || !definition.definitions) {
      return;
    }
    const { definitions } = definition;
    const program = this.service.getProgram();
    if (!program) {
      return;
    }
    const defs = definitions
      .map((def) => {
        const { fileName, textSpan } = def;
        const sourceFile = program.getSourceFile(fileName);
        if (!sourceFile) {
          return;
        }
        const originalRange = this.transformManager.getOriginalRange(
          fileName,
          textSpan.start,
          textSpan.start + textSpan.length
        );
        if (!originalRange) {
          return;
        }
        const start = positionTolineAndCharacter(
          originalRange.source.contents,
          originalRange.start
        );
        const end = positionTolineAndCharacter(originalRange.source.contents, originalRange.end);
        return Location.create(filePathToUri(fileName), { start, end });
      })
      .filter(Boolean) as Location[];
    return defs;
  }
}
