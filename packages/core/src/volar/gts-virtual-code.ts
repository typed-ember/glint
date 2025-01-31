import { CodeInformation, CodeMapping, VirtualCode } from '@volar/language-core';
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
 * A Volar VirtualCode representing .gts/.gjs files, which includes 0+ embedded
 * Handlebars templates within <template> tags.
 *
 * ## Virtual Code Overview (and how we use it)
 *
 * VirtualCodes are one of the most core/central primitives provided by Volar.
 * They are:
 *
 * - Used both in (classic) Language Server mode and in newer TS Plugin mode
 * - Responsible for parsing and transforming source code of a particular language (e.g. GTS)
 *   into embedded codes (e.g. a valid type-checkable TS file wherein all `<template>` tags
 *   have been replaced with valid TS code)
 *
 * ## Embedded Codes
 *
 * The VirtualCode interface has an `embeddedCodes` array that (typically) contains
 * generated code based on the root virtual code file type (in our case, GTS). The generated
 * embedded codes will typically have a different file type ID (e.g. `typescript`); Volar
 * in turn can perform language processing on these specific files (e.g. generate diagnostics),
 * and then propagate these diagnostics upwards to the root virtual code file. In order to do this,
 * we need to provide source code mapping information so that Volar can correctly map the diagnostics
 * back to the original source code.
 *
 * Note that "embedded code" can be somewhat of a confusing concept based on how familiar
 * languages like HTML allow other languages (JS in script tags, CSS in style tags, etc.)
 * to be embedded within a parent file (e.g. HTML). If you were building a VirtualCode for HTML,
 * you would have an `embeddedCodes` array that contains VirtualCodes for the embedded languages,
 * where each VirtualCode had the extracted HTML, CSS, JS, etc contents.
 *
 * But for GTS, the embedded code that we generate does not actually exist in the same form in
 * the parent document (the .gts file); rather, the embedded code is a valid TS file that has
 * been generated from the .gts by replacing all of the embedded `<template>`s with TS. Whereas
 * for HTML, embedded codes are simple extracted strings of HTML, CSS, JS, etc, for GTS, the
 * embedded code is a transformed file that's most likely much larger than the original .gts file.
 *
 * Additionally:
 *
 * - We always generate an embedded code of TypeScript even when the .gts file has no embedded templates
 *   (meaning it is already valid TS). This keeps both our code and the structure of our VirtualCode
 *   simple and consistent. In cases where there are no embedded templates, the embedded code contains
 *   the same contents as the root virtual code file.
 *
 * - Even when there are multiple <template> tags, we only generate 1 embedded TS code representing
 *   the TS code for all of the entire .gts file.
 *
 * - The Root VirtualCode we provide is simple the untransformed .gts file itself. This is a Volar
 *   convention and also allows for the possible of writing language service plugins that operate
 *   directly on .gts (i.e. `glimmer-ts`) files directly (rather than on an embedded code).
 *
 * In summary, `embeddedCodes` is a more general/abstract concept of ANY kind of language that
 * is embedded or generated from the root virtual code file for the purposes of performing
 * language service processing for the particular file type of the embedded code.
 */
export class VirtualGtsCode implements VirtualCode {
  /**
   * The virtual files embedded in the GTS file. (such as <template>)
   */
  embeddedCodes: EmbeddedCodeWithDirectives[] = [];

  /**
   * The id is a unique (within the VirtualCode and its embedded files) id for Volar to identify it. It could be any string.
   */
  id = 'gts';

  mappings: CodeMapping[] = [];

  transformedModule: ReturnType<typeof rewriteModule> | null = null;

  constructor(
    private glintConfig: GlintConfig,
    public snapshot: IScriptSnapshot,
    public languageId: 'glimmer-ts' | 'glimmer-js',
  ) {
    this.update(snapshot);
  }

  // This gets called by the constructor and whenever the language server receives a file change event,
  // i.e. the user saved the file.
  update(snapshot: IScriptSnapshot): void {
    this.snapshot = snapshot;
    const length = snapshot.getLength();

    // The root virtual code is always the untransformed .gts file itself. (See docs/explanation
    // at top of file for more details.) Therefore we declare a mapping that maps the entire
    // contents of the source .gts to the identical "generated" .gts file (which is literally
    // the same contents).
    this.mappings[0] = {
      // Map the entire length of the file from source to "generated"
      sourceOffsets: [0],
      generatedOffsets: [0],
      lengths: [length],

      // The `CodeInformation` specifies the capabilities / language feature enablements for the span
      // of code covered by the mapping. Because this mapping covers the whole file, we are
      // essentially controlling which language features are enabled for the entire .gts file,
      // which ultimately determines whether Volar will pass the contents of this file to
      // any number of the various language feature plugins supported by Volar.
      //
      // Note that we actually disable `verification` here (which controls whether this file
      // will be passed to TS for type-checking) because .gts files are not valid TS (unless
      // they happen to have no embedded <template> tags). The TS type-checking will occur
      // on the embedded TS-transformed code that we generate below.
      data: {
        // I have not personally vetted whether these should be disabled; we should revisit
        // what specifically we actually need.
        completion: true,
        format: true,
        navigation: true,
        semantic: true,
        structure: true,

        // See notes above; we disable verification (which disables TS type-checking) because
        // .gts files are not valid TS (unless they happen to have no embedded <template> tags).
        verification: false,
      } satisfies CodeInformation,
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

    if (transformedModule) {
      // .gts file has embedded templates, so lets generate a new embedded code
      // that contains the transformed TS code.
      const mappings = transformedModule.toVolarMappings();
      this.embeddedCodes = [
        {
          embeddedCodes: [],
          id: 'ts',
          languageId: 'typescript',
          mappings,
          snapshot: new ScriptSnapshot(transformedModule.transformedContents),
          directives: transformedModule.directives,
        },
      ];
    } else {
      // Null transformed module means there's no embedded HBS templates,
      // so just return a full "no-op" mapping from source to transformed.
      //
      // Note that this does mean that both the root virtual code and this embedded
      // code we generate have the same contents, but we will configure the
      // CodeInformation below differently than we do above to enable type-checking
      // on the embedded code. While this might seem a bit wasteful/confusing to have
      // root and embedded code essentially point to the same document, it keeps the
      // structure clean, simple, and consistent, rather than, say, changing the structure
      // of our VirtualCode only in the case of .gts files without embedded templates.
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

              data: {
                completion: true,
                format: false,
                navigation: true,
                semantic: true,
                structure: true,

                // Unlike the root virtual code, we enable verification (which enables TS type-checking).
                verification: true,
              } satisfies CodeInformation,
            },
          ],
          snapshot: new ScriptSnapshot(contents),
          directives: [],
        },
      ];
    }
  }
}
