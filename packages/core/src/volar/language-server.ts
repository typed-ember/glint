#!/usr/bin/env node

import {
  LanguageServiceContext,
  LanguageServicePlugin,
  LanguageServicePluginInstance,
  createConnection,
  createServer,
  createTypeScriptProject,
} from '@volar/language-server/node.js';
import { create as createTypeScriptServicePlugins } from 'volar-service-typescript';
import { createEmberLanguagePlugin } from './ember-language-plugin.js';
import { assert } from '../transform/util.js';
import { ConfigLoader } from '../config/loader.js';
import ts from 'typescript';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import * as vscode from 'vscode-languageserver-protocol';
import { URI } from 'vscode-uri';
import { VirtualGtsCode } from './gts-virtual-code.js';
import { augmentDiagnostic } from '../transform/diagnostics/augmentation.js';
import GlimmerASTMappingTree from '../transform/template/glimmer-ast-mapping-tree.js';
import { Directive, TransformedModule } from '../transform/index.js';
import { Range } from '../transform/template/transformed-module.js';
import { offsetToPosition } from '../language-server/util/position.js';
import { Disposable } from '@volar/language-service';

const connection = createConnection();
const server = createServer(connection);

const EXTENSIONS = ['js', 'ts', 'gjs', 'gts', 'hbs'];

/**
 * Handle the `initialize` request from the client. This is the first request sent by the client to
 * the server. It includes the set of capabilities supported by the client as well as
 * other initialization params needed by the server.
 */
connection.onInitialize((parameters) => {
  // Not sure how tsLocalized is used.
  const tsLocalized = undefined;
  const watchingExtensions = new Set<string>();
  let fileWatcher: Promise<Disposable> | undefined;

  const project = createTypeScriptProject(ts, tsLocalized, (projectContext) => {
    const configFileName = projectContext.configFileName;
    const languagePlugins = [];

    updateFileWatcher();

    // I don't remember why but there are some contexts where a configFileName is not known,
    // in which case we cannot fully activate all of the language plugins.
    if (configFileName) {
      // TODO: Maybe move ConfigLoader higher up so we can reuse it between calls to  `getLanguagePlugins`? That said,
      // Volar takes care of a lot of the same group-by-tsconfig caching that ConfigLoader does,
      // so it might not buy us much value any more.
      const configLoader = new ConfigLoader();
      const glintConfig = configLoader.configForFile(configFileName);

      // TODO: this causes breakage if/when Glint activates for a non-Glint project.
      // But if we don't assert, then we activate TS and Glint for non TS projects,
      // which doubles diagnostics... how to disable the LS entirely if no Glint?
      // assert(glintConfig, 'Glint config is missing');

      if (glintConfig) {
        if (!glintConfig.enableTsPlugin) {
          // When TS Plugin is enabled, we want the TS Plugin to perform all type-checking/diagnostics/etc,
          // rather than the Language Server.
          languagePlugins.unshift(createEmberLanguagePlugin(glintConfig));
        }
      }
    }

    return {
      languagePlugins,
      setup(_language) {
        // Vue tooling takes this opportunity to stash compilerOptions on `language.vue`;
        // do we need to be doing something here?
      },
    };
  });
  return server.initialize(
    parameters,
    project,

    // Return the service plugins required/used by our language server. Service plugins provide
    // functionality for a single file/language type. For example, we use Volar's TypeScript service
    // for type-checking our .gts/.gjs files, but .gts/.gjs files are actually two separate languages
    // (TS + Handlebars) combined into one, but we can use the TS language service because the only
    // scripts we pass to the TS service for type-checking is transformed Intermediate Representation (IR)
    // TypeScript code with all <template> tags converted to type-checkable TS.
    createTypeScriptServicePlugins(ts).map<LanguageServicePlugin>((plugin) => {
      if (plugin.name === 'typescript-semantic') {
        // Extend the default TS service with Glint-specific customizations.
        // Similar approach as:
        // https://github.com/withastro/language-tools/blob/main/packages/language-server/src/plugins/typescript/index.ts#L14
        return {
          ...plugin,
          create(context): LanguageServicePluginInstance {
            const typeScriptPlugin = plugin.create(context);

            return {
              ...typeScriptPlugin,
              async provideDiagnostics(document: TextDocument, token: vscode.CancellationToken) {
                const diagnostics = await typeScriptPlugin.provideDiagnostics!(document, token);
                return filterAndAugmentDiagnostics(context, document, diagnostics);
              },
            };
          },
        };
      } else {
        return plugin;
      }
    }),
  );

  function updateFileWatcher(): void {
    const newExtensions = EXTENSIONS.filter((ext) => !watchingExtensions.has(ext));
    if (newExtensions.length) {
      for (const ext of newExtensions) {
        watchingExtensions.add(ext);
      }
      fileWatcher?.then((dispose) => dispose.dispose());
      fileWatcher = server.fileWatcher.watchFiles([
        '**/*.{' + [...watchingExtensions].join(',') + '}',
      ]);
    }
  }
});

function filterAndAugmentDiagnostics(
  context: LanguageServiceContext,
  document: TextDocument,
  diagnostics: vscode.Diagnostic[] | null | undefined,
): vscode.Diagnostic[] | null {
  if (!diagnostics) {
    // This can fail if .gts file fails to parse. Maybe other use cases too?
    return null;
  }

  // Lazily fetch and cache the VirtualCode -- this might be a premature optimization
  // after the code went through enough changes, so maybe safe to simplify in the future.
  let cachedVirtualCode: VirtualGtsCode | null | undefined = undefined;
  const fetchVirtualCode = (): VirtualGtsCode | null => {
    if (typeof cachedVirtualCode === 'undefined') {
      cachedVirtualCode = null;

      const decoded = context.decodeEmbeddedDocumentUri(URI.parse(document.uri));
      if (decoded) {
        const script = context.language.scripts.get(decoded[0]);
        const scriptRoot = script?.generated?.root;
        if (scriptRoot instanceof VirtualGtsCode) {
          cachedVirtualCode = scriptRoot;
        }
      }
    }

    return cachedVirtualCode;
  };

  const mappingForDiagnostic = (diagnostic: vscode.Diagnostic): GlimmerASTMappingTree | null => {
    const transformedModule = fetchVirtualCode()?.transformedModule;

    if (!transformedModule) {
      return null;
    }

    const range = diagnostic.range;
    const start = document.offsetAt(range.start);
    const end = document.offsetAt(range.end);
    const rangeWithMappingAndSource = transformedModule.getOriginalRange(start, end);
    return rangeWithMappingAndSource.mapping || null;
  };

  const allDiagnostics: vscode.Diagnostic[] = [];

  const augmentedDiagnostics = diagnostics.map((diagnostic) => {
    diagnostic = {
      ...diagnostic,
      source: 'glint',
    };

    return augmentDiagnostic(diagnostic as any, mappingForDiagnostic);
  });

  let unusedExpectErrors = new Set<Directive>();
  const transformedModule = fetchVirtualCode()?.transformedModule;
  if (transformedModule) {
    transformedModule.directives.forEach((directive) => {
      if (directive.kind === 'expect-error') {
        unusedExpectErrors.add(directive);
      }
    });
  }

  augmentedDiagnostics.forEach((diagnostic) => {
    // `diagnostic` is a TS-generated Diagnostic for the transformed TS file (i.e.
    // the Intermediate Representation of the .gts file where all embedded
    // templates are converted to TS).
    //
    // We need to determine whether the TS diagnostic is within the area of effect
    // for a `{{! @glint-expect-error }}` or `{{! @glint-ignore }}` directive in the
    // original untransformed .gts file.
    //
    // In order to do that, we need to translate the directive's area of effect
    // into its mapping .ts equivalent, OR we take the TS diagnostic's range and
    // find the corresponding directive in the transformedModule.

    const diagnosticStart = document.offsetAt(diagnostic.range.start);
    let appliedDirective: Directive | undefined = undefined;

    if (transformedModule) {
      let originalGtsDiagnosticStart = transformedModule?.getOriginalOffset(diagnosticStart);

      appliedDirective = transformedModule?.directives.find((directive) => {
        return (
          // TODO: when would the filename ever be different? uncomment and fix?
          // directive.source.filename === diagnostic.file.fileName &&
          directive.areaOfEffect.start <= originalGtsDiagnosticStart.offset &&
          directive.areaOfEffect.end > originalGtsDiagnosticStart.offset
        );
      });
    }

    if (appliedDirective) {
      unusedExpectErrors.delete(appliedDirective);
    } else {
      allDiagnostics.push(diagnostic);
    }
  });

  if (transformedModule) {
    for (let directive of unusedExpectErrors) {
      const transformedStartOffset = transformedModule.getTransformedOffset(directive.source.filename, directive.location.start);

      // Hacky, but `// @glint-expect-error` is the TS transformed representation of `{{!@glint-expect-error}}`,
      // and its length is 22 characters, and we can use that number to calculate the end position in the transformed file.
      //
      // It would be less hacky if we could use:
      //
      //   transformedModule.getTransformedOffset(directive.source.filename, directive.location.end)
      //
      // But for unknown reasons (perhaps related to how Volar wants us to use 0-length boundary mappings
      // to map unequally-sized regions to each other?), this ends up returning the same value as `directive.location.start`.
      //
      // So we just calculate it out
      const endOffset = directive.location.start + 22;
      const transformedEndOffset = transformedModule.getTransformedOffset(directive.source.filename, endOffset);

      allDiagnostics.push({
        message: `Unused '@glint-expect-error' directive.`,
        range: vscode.Range.create(
          offsetToPosition(transformedModule.transformedContents, transformedStartOffset),
          offsetToPosition(transformedModule.transformedContents, transformedEndOffset),
        ),
        severity: vscode.DiagnosticSeverity.Error,
        code: 0,
        source: directive.source.filename, // not sure if this is right
      });
    }
  }

  return allDiagnostics;
}

/**
 * Invoked when client has sent `initialized` notification.
 */
connection.onInitialized(() => {
  server.initialized();
});

connection.listen();

/**
 * @param {string} uri
 * @returns {Promise<Commands>}
 */
// async function getCommands(uri) {
//   const project = await server.projects.getProject(uri)
//   const service = project.getLanguageService()
//   return service.context.inject('mdxCommands')
// }
