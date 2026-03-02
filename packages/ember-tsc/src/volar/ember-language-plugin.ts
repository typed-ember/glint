import { LanguagePlugin } from '@volar/language-core';
import type ts from 'typescript';
import { URI } from 'vscode-uri';
import { GlintConfig } from '../index.js';
import { VirtualGtsCode } from './gts-virtual-code.js';
export type TS = typeof ts;

/**
 * Create a [Volar](https://volarjs.dev) language plugin to support
 *
 * - .gts/.gjs files (the `ember-template-imports` environment)
 */
export function createEmberLanguagePlugin<T extends URI | string>(
  glintConfig: GlintConfig,
  { clientId }: { clientId?: string } = {},
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
    },

    createVirtualCode(scriptId: URI | string, languageId, snapshot, codegenContext) {
      const scriptIdStr = String(scriptId);

      if (
        languageId === 'glimmer-ts' ||
        languageId === 'glimmer-js' ||
        languageId === 'typescript.glimmer' ||
        languageId === 'javascript.glimmer'
      ) {
        return new VirtualGtsCode(glintConfig, snapshot, languageId, clientId);
      }
    },

    typescript: {
      extraFileExtensions: [
        { extension: 'gts', isMixedContent: true, scriptKind: 7 satisfies ts.ScriptKind.Deferred },
        { extension: 'gjs', isMixedContent: true, scriptKind: 7 satisfies ts.ScriptKind.Deferred },
      ],

      // Allow extension-less imports, e.g. `import Foo from './Foo`.
      // Upstream Volar support for our extension-less use case was added here:
      // https://github.com/volarjs/volar.js/pull/190
      //
      // NOTE: as of Mar 7, 2025, TS Plugin mode does not support extension-less imports.
      // It's possible this could be fixed upstream but we should maybe not count on it.
      //
      // Tracking here: https://github.com/typed-ember/glint/issues/806
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
          case 'typescript.glimmer':
            return {
              code: transformedCode,
              extension: '.ts',
              scriptKind: 3 satisfies ts.ScriptKind.TS,
            };
          case 'glimmer-js':
          case 'javascript.glimmer':
            return {
              code: transformedCode,
              extension: '.js',
              scriptKind: 1 satisfies ts.ScriptKind.JS,
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
