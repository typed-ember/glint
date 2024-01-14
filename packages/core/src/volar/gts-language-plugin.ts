// import remarkMdx from 'remark-mdx'
// import remarkParse from 'remark-parse'
// import {unified} from 'unified'
import { LanguagePlugin } from '@volar/language-core';
import { VirtualGtsCode } from './gts-virtual-code.js';
import type * as ts from 'typescript';
import { GlintConfig, loadConfig } from '../index.js';
import { assert } from '../transform/util.js';
import { VirtualHandlebarsCode } from './handlebars-virtual-code.js';
export type TS = typeof ts;

/**
 * Create a [Volar](https://volarjs.dev) language module to support GTS.
 */
export function createGtsLanguagePlugin(glintConfig: GlintConfig): LanguagePlugin {
  return {
    createVirtualCode(fileId, languageId, snapshot) {
      // TODO: won't we need to point the TS component code to the same thing?
      if (languageId === 'handlebars') {
        return new VirtualHandlebarsCode(glintConfig, snapshot);
      }

      if (languageId === 'glimmer-ts' || languageId === 'glimmer-js') {
        return new VirtualGtsCode(glintConfig, snapshot, languageId);
      }
    },

    updateVirtualCode(fileId, virtualCode, snapshot) {
      (virtualCode as VirtualGtsCode).update(snapshot);
      return virtualCode;
    },

    typescript: {
      extraFileExtensions: [
        { extension: 'gts', isMixedContent: true, scriptKind: 7 },
        { extension: 'gjs', isMixedContent: true, scriptKind: 7 },
        { extension: 'hbs', isMixedContent: true, scriptKind: 7 },
      ],

      // This is called when TS requests the file that we'll be typechecking, which in our case
      // is the transformed Intermediate Representation of ths .gts with the <template> tags
      // converted to type-checkable TS.
      getScript(rootVirtualCode) {
        // The first embeddedCode is always the TS Intermediate Representation code
        const transformedCode = rootVirtualCode.embeddedCodes[0];

        switch (rootVirtualCode.languageId) {
          case 'glimmer-ts':
            return {
              code: transformedCode,
              extension: '.ts',
              scriptKind: 3, // TS
            };
          case 'glimmer-js':
            return {
              // The first embeddedCode is always the TS Intermediate Representation code
              code: transformedCode,
              extension: '.js',
              scriptKind: 1, // JS
            };
          case 'handlebars':
            // TODO: companion file might be .js? Not sure if this is right
            return {
              code: transformedCode,
              extension: '.ts',
              scriptKind: 3, // TS
            };
          default:
            throw new Error(`getScript: Unexpected languageId: ${rootVirtualCode.languageId}`);
        }
      },

      resolveLanguageServiceHost(host) {
        return {
          ...host,
          getCompilationSettings: () => ({
            ...host.getCompilationSettings(),
            // Always allow JS for type checking.
            allowJs: true,
          }),
        };
      },
    },
  };
}
