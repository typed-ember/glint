// import remarkMdx from 'remark-mdx'
// import remarkParse from 'remark-parse'
// import {unified} from 'unified'
import { LanguagePlugin } from '@volar/language-core';
import { VirtualGtsCode } from './gts-virtual-code.js';
import type ts from 'typescript';
import { GlintConfig, loadConfig } from '../index.js';
import { assert } from '../transform/util.js';
import { VirtualHandlebarsCode } from './handlebars-virtual-code.js';
import { URI } from 'vscode-uri';
export type TS = typeof ts;

/**
 * Create a [Volar](https://volarjs.dev) language module to support .gts/.gjs files
 * (the `ember-template-imports` environment)
 */
export function createGtsLanguagePlugin<T extends URI | string>(
  glintConfig: GlintConfig,
): LanguagePlugin<T> {
  return {
    /**
     * For files that are not opened in the IDE, the language ID will not be provided
     * to the language server, so a hook is needed to parse the language ID of files
     * that are known extension but not opened in the IDE.
     *
     * In other words, clients like VSCode and other editors are in charge of determining
     * the language ID and passing it in, but the language ID isn't available in other
     * contexts, in which case this hook is called to determine it for a file based on its
     * extension.
     */
    getLanguageId(fileNameOrUri) {
      if (String(fileNameOrUri).endsWith('.gts')) {
        return 'glimmer-ts';
      }
      if (String(fileNameOrUri).endsWith('.gjs')) {
        return 'glimmer-js';
      }
      if (String(fileNameOrUri).endsWith('.hbs')) {
        return 'handlebars';
      }
    },

    createVirtualCode(uri, languageId, snapshot) {
      // TODO: won't we need to point the TS component code to the same thing?
      if (languageId === 'handlebars') {
        return new VirtualHandlebarsCode(glintConfig, snapshot);
      }

      if (languageId === 'glimmer-ts' || languageId === 'glimmer-js') {
        return new VirtualGtsCode(glintConfig, snapshot, languageId);
      }
    },

    updateVirtualCode(uri, virtualCode, snapshot) {
      (virtualCode as VirtualGtsCode).update(snapshot);
      return virtualCode;
    },

    typescript: {
      extraFileExtensions: [
        { extension: 'gts', isMixedContent: true, scriptKind: 7 satisfies ts.ScriptKind.Deferred },
        { extension: 'gjs', isMixedContent: true, scriptKind: 7 satisfies ts.ScriptKind.Deferred },
        { extension: 'hbs', isMixedContent: true, scriptKind: 7 satisfies ts.ScriptKind.Deferred },
      ],

      // Allow extension-less imports, e.g. `import Foo from './Foo`.
      // Upstream Volar support for our extension-less use case was added here:
      // https://github.com/volarjs/volar.js/pull/190
      resolveHiddenExtensions: true,

      // This is called when TS requests the file that we'll be typechecking, which in our case
      // is the transformed Intermediate Representation of ths .gts with the <template> tags
      // converted to type-checkable TS.
      getServiceScript(rootVirtualCode) {
        // The first embeddedCode is always the TS Intermediate Representation code
        const transformedCode = rootVirtualCode.embeddedCodes?.[0];
        if (!transformedCode) {
          return;
        }

        switch (rootVirtualCode.languageId) {
          case 'glimmer-ts':
            return {
              code: transformedCode,
              extension: '.ts',
              scriptKind: 3 satisfies ts.ScriptKind.TS,
            };
          case 'glimmer-js':
            return {
              code: transformedCode,
              extension: '.js',
              scriptKind: 1 satisfies ts.ScriptKind.JS,
            };
          case 'handlebars':
            // TODO: companion file might be .js? Not sure if this is right
            return {
              code: transformedCode,
              extension: '.ts',
              scriptKind: 3 satisfies ts.ScriptKind.TS,
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
