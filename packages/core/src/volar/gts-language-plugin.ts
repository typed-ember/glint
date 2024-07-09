import { LanguagePlugin } from '@volar/language-core';
import { VirtualGtsCode } from './gts-virtual-code.js';
import type ts from 'typescript';
import { GlintConfig } from '../index.js';
import { URI } from 'vscode-uri';
import { LooseModeBackingComponentClassVirtualCode } from './loose-mode-backing-component-class-virtual-code.js';
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
      const scriptId = String(uri);

      // See: https://github.com/JetBrains/intellij-plugins/blob/11a9149e20f4d4ba2c1600da9f2b81ff88bd7c97/Angular/src/angular-service/src/index.ts#L31
      if (
        languageId === 'typescript' &&
        !scriptId.endsWith('.d.ts') &&
        scriptId.indexOf('/node_modules/') < 0
        // scriptId.indexOf('components/') >= 0 // match anything in the components directory
      ) {
        // let virtualCode = ngTcbBlocks.get(scriptId);
        // if (!virtualCode) {
        //   virtualCode = new AngularVirtualCode(scriptId, ctx, ts.sys.useCaseSensitiveFileNames);
        //   ngTcbBlocks.set(scriptId, virtualCode);
        // }
        // return virtualCode.sourceFileUpdated(snapshot);

        // Need a new VirtualCode LooseModeBackingComponentClassVirtualCode
        return new LooseModeBackingComponentClassVirtualCode(glintConfig, snapshot);
      }

      if (languageId === 'glimmer-ts' || languageId === 'glimmer-js') {
        return new VirtualGtsCode(glintConfig, snapshot, languageId);
      }
    },

    // This is the default implementation; should be able to comment out
    // updateVirtualCode(uri, virtualCode, snapshot) {
    //   (virtualCode as VirtualGtsCode | LooseModeBackingComponentClassVirtualCode).update(snapshot);
    //   return virtualCode;
    // },

    isAssociatedFileOnly(_scriptId: string | URI, languageId: string): boolean {
      // `ember-loose` only
      //
      // Because we declare handlebars files to be associated with "root" .ts files, we
      // need to mark them here as "associated file only" so that TS doesn't attempt
      // to type-check them directly, but rather indirectly via the .ts file.
      return languageId === 'handlebars';
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
