import { CodeMapping, VirtualCode } from '@volar/language-core';
import { IScriptSnapshot } from 'typescript';
import { ScriptSnapshot } from './script-snapshot.js';
import type ts from 'typescript';
import { Directive, rewriteModule } from '../transform/index.js';
import { GlintConfig } from '../index.js';
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
  /**
   * The id is a unique (within the VirtualCode and its embedded files) id for Volar to identify it. It could be any string.
   */
  id = 'loose-mode-component-class';

  mappings: CodeMapping[] = [];

  transformedModule: ReturnType<typeof rewriteModule> | null = null;

  get languageId(): string {
    return "typescript"
  }

  constructor(
    private glintConfig: GlintConfig,
    public snapshot: IScriptSnapshot
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

    let script = { filename: 'disregard.gts', contents };
    let template = undefined;

    const transformedModule = rewriteModule(
      this.glintConfig.ts,
      { script, template },
      this.glintConfig.environment,
    );

    this.transformedModule = transformedModule;

    // if (transformedModule) {
    //   const mappings = transformedModule.toVolarMappings();
    //   this.embeddedCodes = [
    //     {
    //       embeddedCodes: [],
    //       id: 'ts',
    //       languageId: 'typescript',
    //       mappings,
    //       snapshot: new ScriptSnapshot(transformedModule.transformedContents),
    //       directives: transformedModule.directives,
    //     },
    //   ];
    // } else {
    //   // Null transformed module means there's no embedded HBS templates,
    //   // so just return a full "no-op" mapping from source to transformed.
    //   this.embeddedCodes = [
    //     {
    //       embeddedCodes: [],
    //       id: 'ts',
    //       languageId: 'typescript',
    //       mappings: [
    //         // The Volar mapping that maps all TS syntax of the MDX file to the virtual TS file.
    //         // So I think in the case of a Single-File-Component (1 <template> tag surrounded by TS),
    //         // You'll end up with 2 entries in sourceOffets, representing before the <template> and after the </template>.
    //         {
    //           // sourceOffsets: [],
    //           // generatedOffsets: [],
    //           // lengths: [],

    //           // Hacked hardwired values for now.
    //           sourceOffsets: [0],
    //           generatedOffsets: [0],
    //           lengths: [length],

    //           // This controls which language service features are enabled within this root virtual code.
    //           // Since this is just .ts, we want all of them enabled.
    //           data: {
    //             completion: true,
    //             format: false,
    //             navigation: true,
    //             semantic: true,
    //             structure: true,
    //             verification: true,
    //           },
    //         },
    //       ],
    //       snapshot: new ScriptSnapshot(contents),
    //       directives: [],
    //     },
    //   ];
    // }
  }
}
