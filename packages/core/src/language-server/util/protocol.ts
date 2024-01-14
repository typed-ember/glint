import type * as ts from 'typescript';
import {
  CompletionItemKind,
  DiagnosticSeverity,
  DiagnosticTag,
  SymbolKind,
} from '@volar/language-server';

type TS = typeof ts;

/*
 * This module contains utilities for converting between conventions used
 * by the Language Server Protocol and TypeScript's language services interface.
 */

export function scriptElementKindToCompletionItemKind(
  ts: TS,
  kind: ts.ScriptElementKind
): CompletionItemKind {
  switch (kind) {
    case ts.ScriptElementKind.primitiveType:
    case ts.ScriptElementKind.keyword:
      return CompletionItemKind.Keyword;
    case ts.ScriptElementKind.variableElement:
    case ts.ScriptElementKind.localVariableElement:
    case ts.ScriptElementKind.letElement:
    case ts.ScriptElementKind.constElement:
    case ts.ScriptElementKind.alias:
    case ts.ScriptElementKind.parameterElement:
      return CompletionItemKind.Variable;
    case ts.ScriptElementKind.memberVariableElement:
    case ts.ScriptElementKind.memberGetAccessorElement:
    case ts.ScriptElementKind.memberSetAccessorElement:
      return CompletionItemKind.Field;
    case ts.ScriptElementKind.functionElement:
    case ts.ScriptElementKind.memberFunctionElement:
    case ts.ScriptElementKind.constructSignatureElement:
    case ts.ScriptElementKind.callSignatureElement:
    case ts.ScriptElementKind.indexSignatureElement:
      return CompletionItemKind.Function;
    case ts.ScriptElementKind.enumElement:
      return CompletionItemKind.Enum;
    case ts.ScriptElementKind.moduleElement:
      return CompletionItemKind.Module;
    case ts.ScriptElementKind.classElement:
      return CompletionItemKind.Class;
    case ts.ScriptElementKind.interfaceElement:
      return CompletionItemKind.Interface;
    case ts.ScriptElementKind.warning:
    case ts.ScriptElementKind.scriptElement:
      return CompletionItemKind.File;
    case ts.ScriptElementKind.directory:
      return CompletionItemKind.Folder;
    case ts.ScriptElementKind.jsxAttribute:
      return CompletionItemKind.Property;
    default:
      return CompletionItemKind.Text;
  }
}

export function scriptElementKindToSymbolKind(ts: TS, kind: ts.ScriptElementKind): SymbolKind {
  switch (kind) {
    case ts.ScriptElementKind.memberVariableElement:
    case ts.ScriptElementKind.indexSignatureElement:
      return SymbolKind.Field;
    case ts.ScriptElementKind.memberGetAccessorElement:
    case ts.ScriptElementKind.memberSetAccessorElement:
    case ts.ScriptElementKind.memberFunctionElement:
      return SymbolKind.Method;
    case ts.ScriptElementKind.functionElement:
    case ts.ScriptElementKind.localFunctionElement:
    case ts.ScriptElementKind.constructSignatureElement:
    case ts.ScriptElementKind.callSignatureElement:
      return SymbolKind.Function;
    case ts.ScriptElementKind.enumElement:
      return SymbolKind.Enum;
    case ts.ScriptElementKind.moduleElement:
      return SymbolKind.Module;
    case ts.ScriptElementKind.classElement:
    case ts.ScriptElementKind.localClassElement:
      return SymbolKind.Class;
    case ts.ScriptElementKind.interfaceElement:
      return SymbolKind.Interface;
    case ts.ScriptElementKind.scriptElement:
      return SymbolKind.File;
    case ts.ScriptElementKind.jsxAttribute:
      return SymbolKind.Property;
    case ts.ScriptElementKind.constElement:
    case ts.ScriptElementKind.enumMemberElement:
      return SymbolKind.Constant;
    default:
      return SymbolKind.Variable;
  }
}

export function tagsForDiagnostic(diagnostic: ts.Diagnostic): DiagnosticTag[] {
  let tags: Array<DiagnosticTag> = [];

  if (diagnostic.reportsUnnecessary) {
    tags.push(DiagnosticTag.Unnecessary);
  }

  if (diagnostic.reportsDeprecated) {
    tags.push(DiagnosticTag.Deprecated);
  }

  return tags;
}

export function severityForDiagnostic(ts: TS, diagnostic: ts.Diagnostic): DiagnosticSeverity {
  switch (diagnostic.category) {
    case ts.DiagnosticCategory.Error:
      return DiagnosticSeverity.Error;
    case ts.DiagnosticCategory.Message:
      return DiagnosticSeverity.Information;
    case ts.DiagnosticCategory.Suggestion:
      return DiagnosticSeverity.Hint;
    case ts.DiagnosticCategory.Warning:
      return DiagnosticSeverity.Warning;
  }
}
