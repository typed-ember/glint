import { type WorkspaceConfiguration, window } from 'vscode';
import type * as ts from 'typescript/lib/tsserverlibrary';

// vscode does not hold formatting config with the same interface as typescript
// the following maps the vscode formatting options into what typescript expects
// This is heavily borrowed from how the TypeScript works in vscode
// https://github.com/microsoft/vscode/blob/c04c0b43470c3c743468a5e5e51f036123503452/extensions/typescript-language-features/src/languageFeatures/fileConfigurationManager.ts#L133
export function intoFormatting(
  config: WorkspaceConfiguration
): ts.server.protocol.FormatCodeSettings {
  let editorOptions = window.activeTextEditor?.options;
  let tabSize = typeof editorOptions?.tabSize === 'string' ? undefined : editorOptions?.tabSize;
  let insertSpaces =
    typeof editorOptions?.insertSpaces === 'string' ? undefined : editorOptions?.insertSpaces;

  return {
    tabSize,
    indentSize: tabSize,
    convertTabsToSpaces: insertSpaces,
    // We can use \n here since the editor normalizes later on to its line endings.
    newLineCharacter: '\n',
    insertSpaceAfterCommaDelimiter: config.get<boolean>('insertSpaceAfterCommaDelimiter'),
    insertSpaceAfterConstructor: config.get<boolean>('insertSpaceAfterConstructor'),
    insertSpaceAfterSemicolonInForStatements: config.get<boolean>(
      'insertSpaceAfterSemicolonInForStatements'
    ),
    insertSpaceBeforeAndAfterBinaryOperators: config.get<boolean>(
      'insertSpaceBeforeAndAfterBinaryOperators'
    ),
    insertSpaceAfterKeywordsInControlFlowStatements: config.get<boolean>(
      'insertSpaceAfterKeywordsInControlFlowStatements'
    ),
    insertSpaceAfterFunctionKeywordForAnonymousFunctions: config.get<boolean>(
      'insertSpaceAfterFunctionKeywordForAnonymousFunctions'
    ),
    insertSpaceBeforeFunctionParenthesis: config.get<boolean>(
      'insertSpaceBeforeFunctionParenthesis'
    ),
    insertSpaceAfterOpeningAndBeforeClosingNonemptyParenthesis: config.get<boolean>(
      'insertSpaceAfterOpeningAndBeforeClosingNonemptyParenthesis'
    ),
    insertSpaceAfterOpeningAndBeforeClosingNonemptyBrackets: config.get<boolean>(
      'insertSpaceAfterOpeningAndBeforeClosingNonemptyBrackets'
    ),
    insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces: config.get<boolean>(
      'insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces'
    ),
    insertSpaceAfterOpeningAndBeforeClosingEmptyBraces: config.get<boolean>(
      'insertSpaceAfterOpeningAndBeforeClosingEmptyBraces'
    ),
    insertSpaceAfterOpeningAndBeforeClosingTemplateStringBraces: config.get<boolean>(
      'insertSpaceAfterOpeningAndBeforeClosingTemplateStringBraces'
    ),
    insertSpaceAfterOpeningAndBeforeClosingJsxExpressionBraces: config.get<boolean>(
      'insertSpaceAfterOpeningAndBeforeClosingJsxExpressionBraces'
    ),
    insertSpaceAfterTypeAssertion: config.get<boolean>('insertSpaceAfterTypeAssertion'),
    placeOpenBraceOnNewLineForFunctions: config.get<boolean>('placeOpenBraceOnNewLineForFunctions'),
    placeOpenBraceOnNewLineForControlBlocks: config.get<boolean>(
      'placeOpenBraceOnNewLineForControlBlocks'
    ),
    semicolons: config.get<ts.server.protocol.SemicolonPreference>('semicolons'),
  };
}
