import {
  LanguageServicePlugin,
  LanguageServicePluginInstance,
  LanguageServiceContext,
} from '@volar/language-service';
import { create as createTypeScriptServices } from 'volar-service-typescript';
import * as vscode from 'vscode-languageserver-protocol';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';
import { offsetToPosition } from '../language-server/util/position.js';
import { augmentDiagnostic } from '../transform/diagnostics/augmentation.js';
import { Directive } from '../transform/index.js';
import GlimmerASTMappingTree from '../transform/template/glimmer-ast-mapping-tree.js';
import { VirtualGtsCode } from './gts-virtual-code.js';

// Return the service plugins required/used by our language server. Service plugins provide
// functionality for a single file/language type. For example, we use Volar's TypeScript service
// for type-checking our .gts/.gjs files, but .gts/.gjs files are actually two separate languages
// (TS + Handlebars) combined into one, but we can use the TS language service because the only
// scripts we pass to the TS service for type-checking is transformed Intermediate Representation (IR)
// TypeScript code with all <template> tags converted to type-checkable TS.
export function createTypescriptLanguageServicePlugin(ts: typeof import('typescript')) {
  return createTypeScriptServices(ts).map<LanguageServicePlugin>((plugin) => {
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
  });
}
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

  const augmentedDiagnostics = diagnostics.map((diagnostic) => {
    diagnostic = {
      ...diagnostic,
      source: 'glint',
    };

    return augmentDiagnostic(diagnostic as any, mappingForDiagnostic);
  });

  return augmentedDiagnostics;
}
