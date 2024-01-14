import { CodeMapping, VirtualCode } from '@volar/language-core';
import { IScriptSnapshot } from 'typescript';
import { ScriptSnapshot } from './script-snapshot.js';
import type * as ts from 'typescript';
import { rewriteModule } from '../transform/index.js';
import { GlintConfig } from '../index.js';
export type TS = typeof ts;

/**
 * A Volar virtual code that contains some additional metadata for .hbs files.
 *
 * When the editor opens an .hbs file it'll request a virtual file to be created
 * for it. The scheme we use is:
 *
 * 1. Look for corresponding .js/.ts backing class, which might be:
 * - component
 * - route
 * - controller ???
 */
export class VirtualHandlebarsCode implements VirtualCode {
  /**
   * For .hbs file, the embeddedCodes are the combined
   */
  embeddedCodes: VirtualCode<string>[] = [];

  /**
   * The id is a unique (within the VirtualCode and its embedded files) id for Volar to identify it. It could be any string.
   */
  id = 'hbs';

  mappings: CodeMapping[] = [];

  languageId = 'handlebars';

  constructor(private glintConfig: GlintConfig, public snapshot: IScriptSnapshot) {
    this.update(snapshot);
  }

  // This gets called by the constructor and whenever the language server receives a file change event,
  // i.e. the user saved the file.
  update(snapshot: IScriptSnapshot) {
    this.snapshot = snapshot;
    const length = snapshot.getLength();

    // Define a single mapping for the root virtual code (the untransformed .hbs file).
    this.mappings[0] = {
      sourceOffsets: [0],
      generatedOffsets: [0],
      lengths: [length],
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

    // The script we were asked for doesn't exist, but a corresponding template does, and
    // it doesn't have a companion script elsewhere.
    // We default to just `export {}` to reassure TypeScript that this is definitely a module
    // TODO: this `export {}` is falsely mapping (see in Volar Labs), not sure what impact / solution is.
    let script = { filename: 'disregard.ts', contents: 'export {}' };
    let template = {
      filename: 'disregard.hbs',
      contents,
    };

    const transformedModule = rewriteModule(
      this.glintConfig.ts,
      { script, template },
      this.glintConfig.environment
    );

    if (transformedModule) {
      this.embeddedCodes = [
        {
          embeddedCodes: [],
          id: 'ts',
          languageId: 'typescript',
          mappings: transformedModule.toVolarMappings(),
          snapshot: new ScriptSnapshot(transformedModule.transformedContents),
        },
      ];
    } else {
      // Null transformed module means there's no embedded HBS templates,
      // so just return a full "no-op" mapping from source to transformed.
      this.embeddedCodes = [
        {
          embeddedCodes: [],
          id: 'ts',
          languageId: 'typescript',
          mappings: [
            // The Volar mapping that maps all TS syntax of the MDX file to the virtual TS file.
            // So I think in the case of a Single-File-Component (1 <template> tag surrounded by TS),
            // You'll end up with 2 entries in sourceOffets, representing before the <template> and after the </template>.
            {
              // Hacked hardwired values for now.
              sourceOffsets: [0],
              generatedOffsets: [0],
              lengths: [length],

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
        },
      ];
    }
  }
}
