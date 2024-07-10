import { CodeMapping, VirtualCode } from '@volar/language-core';
import { IScriptSnapshot } from 'typescript';
import { ScriptSnapshot } from './script-snapshot.js';
import type ts from 'typescript';
import { Directive, rewriteModule } from '../transform/index.js';
import { GlintConfig } from '../index.js';
import { CodegenContext, SourceScript } from '@volar/language-core/lib/types.js';
import { URI } from 'vscode-uri';
export type TS = typeof ts;

interface EmbeddedCodeWithDirectives extends VirtualCode {
  directives: readonly Directive[];
}

/**
 * A Volar VirtualCode representing the .ts/.js file of a Ember/Glimmer component
 * class that serves as a backing class for an associated .hbs template. These kinds of
 * components are only supported when using `ember-loose` environment.
 */
export class LooseModeBackingComponentClassVirtualCode implements VirtualCode {
  embeddedCodes: EmbeddedCodeWithDirectives[] = [];

  /**
   * The id is a unique (within the VirtualCode and its embedded files) id for Volar to identify it. It could be any string.
   */
  id = 'loose-mode-component-class';

  mappings: CodeMapping[] = [];

  transformedModule: ReturnType<typeof rewriteModule> | null = null;

  get languageId(): string {
    return 'typescript';
  }

  constructor(
    private glintConfig: GlintConfig,
    public snapshot: IScriptSnapshot,
    public fileId: URI | string,
    public codegenContext: CodegenContext,
  ) {
    this.update(snapshot);
  }

  // This gets called by the constructor and whenever the language server receives a file change event,
  // i.e. the user saved the file.
  update(snapshot: IScriptSnapshot): void {
    this.snapshot = snapshot;
    const length = snapshot.getLength();

    this.mappings[0] = {
      sourceOffsets: [0],
      generatedOffsets: [0],
      lengths: [length],

      // This controls which language service features are enabled within this root virtual code
      data: {
        completion: true,
        format: true,
        navigation: true,
        semantic: true,
        structure: true,
        verification: true,
      },
    };

    const contents = snapshot.getText(0, length);

    const templatePathCandidate = this.glintConfig.environment.getPossibleTemplatePaths(
      String(this.fileId),
    )[0];

    if (!templatePathCandidate) {
      // TODO: this probably shouldn't be an error; just trying to fail fast for tests for now
      throw new Error(`Could not find a template file candidate for ${this.fileId}`);
    }

    const associatedScriptFileId =
      typeof this.fileId == 'string'
        ? templatePathCandidate.path
        : URI.parse(templatePathCandidate.path);
    const hbsSourceScript = this.codegenContext.getAssociatedScript(associatedScriptFileId);

    if (!hbsSourceScript) {
      // TODO: this probably shouldn't be an error; just trying to fail fast for tests for now
      let msg = `Could not find a source script for ${templatePathCandidate.path}`;
      // throw new Error(msg);
      return;
    }

    const hbsLength = hbsSourceScript.snapshot.getLength();
    const hbsContent = hbsSourceScript.snapshot.getText(0, hbsLength);
    const sourceTsFileName = String(this.fileId);

    const transformedModule = rewriteModule(
      this.glintConfig.ts,
      {
        script: {
          filename: sourceTsFileName,
          contents,
        },
        template: {
          filename: templatePathCandidate.path,
          contents: hbsContent,
        },
      },
      this.glintConfig.environment,
    );

    this.transformedModule = transformedModule;

    if (transformedModule) {
      const volarTsMappings = transformedModule.toVolarMappings(sourceTsFileName);
      const volarHbsMappings = transformedModule.toVolarMappings(templatePathCandidate.path);
      this.embeddedCodes = [
        {
          embeddedCodes: [],
          id: 'ts',
          languageId: 'typescript',

          // Mappings from the backing component class file to the transformed module.
          mappings: volarTsMappings,
          snapshot: new ScriptSnapshot(transformedModule.transformedContents),
          directives: transformedModule.directives,

          // Mappings from the .hbs template file to the transformed module.
          associatedScriptMappings: new Map([[hbsSourceScript.id, volarHbsMappings]]),
        },
      ];
    } else {
      // TODO: when would we get here? I guess Handlebars script might have a parse error?
      // Null transformed module means there's no embedded HBS templates,
      // so just return a full "no-op" mapping from source to transformed.
      this.embeddedCodes = [
        {
          embeddedCodes: [],
          id: 'ts',
          languageId: 'typescript',
          mappings: [
            {
              // Hacked hardwired values for now.
              sourceOffsets: [0],
              generatedOffsets: [0],
              lengths: [length],

              // This controls which language service features are enabled within this root virtual code.
              // Since this is just .ts, we want all of them enabled.
              data: {
                completion: true,
                format: false,
                navigation: true,
                semantic: true,
                structure: true,
                verification: true,
              },
            },
          ],
          snapshot: new ScriptSnapshot(contents),
          directives: [],
        },
      ];
    }
  }
}
