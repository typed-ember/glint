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
import { createGtsLanguagePlugin } from './gts-language-plugin.js';
import { assert } from '../transform/util.js';
import { ConfigLoader } from '../config/loader.js';
import ts from 'typescript';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import * as vscode from 'vscode-languageserver-protocol';
import { URI } from 'vscode-uri';
import { VirtualGtsCode } from './gts-virtual-code.js';
import { augmentDiagnostic } from '../transform/diagnostics/augmentation.js';
import MappingTree from '../transform/template/mapping-tree.js';
import { Directive, TransformedModule } from '../transform/index.js';
import { Range } from '../transform/template/transformed-module.js';
import { offsetToPosition } from '../language-server/util/position.js';

const connection = createConnection();

const server = createServer(connection);

/**
 * Handle the `initialize` request from the client. This is the first request sent by the client to
 * the server. It includes the set of capabilities supported by the client as well as
 * other initialization params needed by the server.
 */
connection.onInitialize((parameters) => {
  const project = createTypeScriptProject(ts, undefined, (projectContext) => {
    const configFileName = projectContext.configFileName;
    const languagePlugins = [];

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
        languagePlugins.unshift(createGtsLanguagePlugin(glintConfig));
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
              async provideSemanticDiagnostics(
                document: TextDocument,
                token: vscode.CancellationToken,
              ) {
                const diagnostics = await typeScriptPlugin.provideSemanticDiagnostics!(
                  document,
                  token,
                );
                return filterAndAugmentDiagnostics(context, document, diagnostics);
              },
            };
          },
        };
      } else {
        return plugin;
      }
    }),
    { pullModelDiagnostics: true },
  );
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

  const mappingForDiagnostic = (diagnostic: vscode.Diagnostic): MappingTree | null => {
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

  for (let directive of unusedExpectErrors) {
    // desired methond on transformedModule:
    // - it accepts a source offset and finds the transformed offset
    // - in which file? there are multiple embeddedCodes in a .gts file
    // - root: gts
    //   - embeddedCodes[0]: ts (IR)
    //   - embeddedCodes[1, 2, 3]: however many Handlebars templates
    //
    // transformedModule.correlatedSpans[1].mapping.children[0].children[1].sourceNode
    // - {type: 'MustacheCommentStatement', value: ' @glint-expect-error ', loc: SourceSpan}
    //
    // this is what we want.
    //
    // OK what is our input?
    // the starting point is directive that is left over.
    // directive.areaOfEffect.start/end reference to the offset within the .gts file delineating: |{{! @glint-expect-error }}|
    //
    // directive.source: {
    //   contents: <GTS source code with untransformed template>
    //   filename: "disregard.gts"
    // }
    //
    // determineTransformedOffsetAndSpan(
    //   originalFileName: string,
    //   originalOffset: number
    // )
    //
    // transformedModule.determineTransformedOffsetAndSpan(directive.source.filename, directive.location.start)
    //
    // this returns a transformedOffset and correlatedSpan with mapping pointing to the template embedded.
    //

    allDiagnostics.push({
      message: `Unused '@glint-expect-error' directive.`,

      // this range... should be... for the TS file. Currently we're sending
      // a range for the source .gts. That can't be right.
      // The info we have is....... we know an unused glint directive exists.
      // We need to find a range in the IR .ts file.
      //
      // 1. need to translate directive.areaOfEffect into the IR .ts file location
      //    - this is going to be the beginning of line in .gts and end of line in .gts.
      //    - actually maybe it's not area of effect, but rather the comment node. YES.
      //  emit.forNode(node, () => {
      //   emit.text(`// @glint-${kind}`);
      //   emit.newline();
      // });
      //
      // - can we take the souce and query the CommentNode
      //   - node: AST.MustacheCommentStatement | AST.CommentStatement
      // - what/how do we query now?
      //
      // 2. need to make sure it fits error boundary
      range: vscode.Range.create(
        offsetToPosition(document.getText(), directive.areaOfEffect.start),
        offsetToPosition(document.getText(), directive.areaOfEffect.end),
      ),
      severity: vscode.DiagnosticSeverity.Error,
      code: 0,
      source: directive.source.filename, // not sure if this is right
    });
  }

  return allDiagnostics;
}

// connection.onRequest('mdx/toggleDelete', async (parameters) => {
//   const commands = await getCommands(parameters.uri)
//   return commands.toggleDelete(parameters)
// })

// connection.onRequest('mdx/toggleEmphasis', async (parameters) => {
//   const commands = await getCommands(parameters.uri)
//   return commands.toggleEmphasis(parameters)
// })

// connection.onRequest('mdx/toggleInlineCode', async (parameters) => {
//   const commands = await getCommands(parameters.uri)
//   return commands.toggleInlineCode(parameters)
// })

// connection.onRequest('mdx/toggleStrong', async (parameters) => {
//   const commands = await getCommands(parameters.uri)
//   return commands.toggleStrong(parameters)
// })

/**
 * Invoked when client has sent `initialized` notification. Volar takes this
 * opportunity to finish initializing, and we tell the client which extensions
 * it should add file-watchers for (technically file-watchers could eagerly
 * be set up on the client (e.g. when the extension activates), but since Volar
 * capabilities use dynamic/deferredregistration, we have the server tell the
 * client which files to watch via the deferred `registerCapability` message
 * within `watchFiles()`).
 */
connection.onInitialized(() => {
  server.initialized();

  const extensions = ['js', 'ts', 'gjs', 'gts', 'hbs'];

  server.watchFiles([`**.*.{${extensions.join(',')}}`]);
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
