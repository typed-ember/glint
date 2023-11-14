import type { WorkspaceConfiguration } from 'vscode';
import type * as ts from 'typescript/lib/tsserverlibrary';

// vscode does not hold preferences with the same interface as typescript
// the following maps the vscode typescript preferences into what typescript expects
// This is heavily borrowed from vscode
// https://github.com/microsoft/vscode/blob/c04c0b43470c3c743468a5e5e51f036123503452/extensions/typescript-language-features/src/languageFeatures/fileConfigurationManager.ts#L167
export function intoPreferences(
  config: WorkspaceConfiguration,
  preferences: WorkspaceConfiguration
): ts.server.protocol.UserPreferences {
  return {
    quotePreference: getQuoteStylePreference(preferences),
    importModuleSpecifierPreference: getImportModuleSpecifierPreference(preferences),
    importModuleSpecifierEnding: getImportModuleSpecifierEndingPreference(preferences),
    includeCompletionsWithClassMemberSnippets: config.get<boolean>(
      'suggest.classMemberSnippets.enabled',
      true
    ),
    includeCompletionsWithObjectLiteralMethodSnippets: config.get<boolean>(
      'suggest.objectLiteralMethodSnippets.enabled',
      true
    ),
    includeCompletionsWithSnippetText: true,
    useLabelDetailsInCompletionEntries: true,
    allowIncompleteCompletions: true,
    displayPartsForJSDoc: true,
    ...getInlayHintsPreferences(config),
  };
}

function getQuoteStylePreference(config: WorkspaceConfiguration): 'single' | 'double' | 'auto' {
  switch (config.get<string>('quoteStyle')) {
    case 'single':
      return 'single';
    case 'double':
      return 'double';
    default:
      return 'auto';
  }
}

function getImportModuleSpecifierEndingPreference(
  config: WorkspaceConfiguration
): 'minimal' | 'index' | 'js' | 'auto' {
  switch (config.get<string>('importModuleSpecifierEnding')) {
    case 'minimal':
      return 'minimal';
    case 'index':
      return 'index';
    case 'js':
      return 'js';
    default:
      return 'auto';
  }
}

function getImportModuleSpecifierPreference(
  config: WorkspaceConfiguration
): 'project-relative' | 'relative' | 'non-relative' | undefined {
  switch (config.get<string>('importModuleSpecifier')) {
    case 'project-relative':
      return 'project-relative';
    case 'relative':
      return 'relative';
    case 'non-relative':
      return 'non-relative';
    default:
      return undefined;
  }
}

type InlaysPreferences<T> = T extends `includeInlay${string}` ? T : never;

function getInlayHintsPreferences(
  config: WorkspaceConfiguration
): Pick<
  ts.server.protocol.UserPreferences,
  InlaysPreferences<keyof ts.server.protocol.UserPreferences>
> {
  return {
    includeInlayParameterNameHints: getInlayParameterNameHintsPreference(config),
    includeInlayParameterNameHintsWhenArgumentMatchesName: !config.get<boolean>(
      'inlayHints.parameterNames.suppressWhenArgumentMatchesName',
      true
    ),
    includeInlayFunctionParameterTypeHints: config.get<boolean>(
      'inlayHints.parameterTypes.enabled',
      false
    ),
    includeInlayVariableTypeHints: config.get<boolean>('inlayHints.variableTypes.enabled', false),
    includeInlayVariableTypeHintsWhenTypeMatchesName: !config.get<boolean>(
      'inlayHints.variableTypes.suppressWhenTypeMatchesName',
      true
    ),
    includeInlayPropertyDeclarationTypeHints: config.get<boolean>(
      'inlayHints.propertyDeclarationTypes.enabled',
      false
    ),
    includeInlayFunctionLikeReturnTypeHints: config.get<boolean>(
      'inlayHints.functionLikeReturnTypes.enabled',
      false
    ),
    includeInlayEnumMemberValueHints: config.get<boolean>(
      'inlayHints.enumMemberValues.enabled',
      false
    ),
  } as const;
}

function getInlayParameterNameHintsPreference(
  config: WorkspaceConfiguration
): 'none' | 'literals' | 'all' | undefined {
  switch (config.get<string>('inlayHints.parameterNames.enabled')) {
    case 'none':
      return 'none';
    case 'literals':
      return 'literals';
    case 'all':
      return 'all';
    default:
      return undefined;
  }
}
