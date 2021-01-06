import { TransformedModule, rewriteModule, rewriteDiagnostic } from '@glint/transform';
import type ts from 'typescript';
import { GlintConfig } from '@glint/config';
import { lineAndCharacterToPosition } from './util';

export type RangeWithMappingAndSource = ReturnType<TransformedModule['getOriginalRange']>;

export type TemplateInfo = {
  tsFileName: string;
  contents: string;
};

export default class TransformManager {
  private transformedModules = new Map<string, TransformedModule>();
  private templates = new Map<string, TemplateInfo>();

  constructor(private ts: typeof import('typescript'), private glintConfig: GlintConfig) {}

  public setTemplateContents(templateFileName: string, contents: string): void {
    const template = this.templates.get(templateFileName);
    if (template) {
      template.contents = contents;
    }
  }

  public getTemplateContents(templateFileName: string): string | undefined {
    const template = this.templates.get(templateFileName);
    if (template) {
      return template.contents;
    }
  }

  public getTemplateTsFile(templateFileName: string): string | undefined {
    const templateInfo = this.templates.get(templateFileName);
    return templateInfo ? templateInfo.tsFileName : undefined;
  }

  public getTemplateTsFilePos(
    templateFileName: string,
    line: number,
    character: number
  ): number | undefined {
    const tsFileName = this.getTemplateTsFile(templateFileName);
    if (!tsFileName) {
      return;
    }
    const transformedModule = this.transformedModules.get(tsFileName);
    if (!transformedModule) {
      return;
    }
    const contents = this.getTemplateContents(templateFileName);
    if (!contents) {
      return;
    }
    const templatePos = lineAndCharacterToPosition(contents, line, character);
    return transformedModule.getTransformedOffset(templateFileName, templatePos);
  }

  public getOriginalRange(
    fileName: string,
    start: number,
    end: number
  ): ReturnType<TransformedModule['getOriginalRange']> | undefined {
    const transformedModule = this.transformedModules.get(fileName);
    if (!transformedModule) {
      return;
    }
    return transformedModule.getOriginalRange(start, end);
  }

  public getTsFileTemplateRange(
    tsFileName: string,
    textSpan: ts.TextSpan
  ): RangeWithMappingAndSource | undefined {
    const transformedModule = this.transformedModules.get(tsFileName);
    if (!transformedModule) {
      return;
    }
    const { start, length } = textSpan;
    return transformedModule.getOriginalRange(start, start + length);
  }

  public getTransformDiagnostics(fileName?: string): Array<ts.Diagnostic> {
    if (fileName) {
      let transformedModule = this.transformedModules.get(fileName);
      return transformedModule ? this.buildDiagnostics(transformedModule) : [];
    }

    return [...this.transformedModules.values()].flatMap((transformedModule) => {
      return this.buildDiagnostics(transformedModule);
    });
  }

  public getTransformedDiagnostic(diagnostic: ts.Diagnostic): ts.Diagnostic {
    return rewriteDiagnostic(this.ts, diagnostic, (fileName) =>
      this.transformedModules.get(fileName)
    );
  }

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
      let tcontents;
      if (templatePath) {
        const cachedTemplateContents = this.getTemplateContents(templatePath);
        tcontents = cachedTemplateContents
          ? cachedTemplateContents
          : this.ts.sys.readFile(templatePath) ?? '';
      }
      let template = { filename: templatePath ?? '', contents: tcontents ?? '' };
      if (template.filename) {
        this.templates.set(template.filename, {
          tsFileName: filename,
          contents: template.contents,
        });
      }

      let transformedModule = rewriteModule({ script, template }, config.environment);
      if (transformedModule) {
        this.transformedModules.set(filename, transformedModule);
        return transformedModule.transformedContents;
      }
    }

    return contents;
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
