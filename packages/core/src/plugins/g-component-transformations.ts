import type { LanguageServicePlugin } from '@volar/language-service';
import type * as vscode from 'vscode-languageserver-protocol';
import { getEmbeddedInfo } from './utils.js';

/**
 * Provides code actions for transforming between class components and template-only components
 * in .gts/.gjs files.
 *
 * Supported transformations:
 *   - Convert a class component (e.g. `class Foo extends Component<Sig> { <template>...</template> }`)
 *     to a template-only component (`<template>...</template>` or `const Foo: TOC<Sig> = <template>...</template>`)
 *   - Convert a template-only component to a class component
 *
 * @GLINT_FEATURE_CODE_ACTIONS
 * @GLINT_FEATURE_CODE_ACTIONS_COMPONENT_TRANSFORMATIONS
 */
export function create(): LanguageServicePlugin {
  return {
    name: 'g-component-transformations',
    capabilities: {
      codeActionProvider: {
        codeActionKinds: ['refactor.rewrite'],
      },
    },
    create(context) {
      return {
        provideCodeActions(document, range, _codeActionContext, _token) {
          const info = getEmbeddedInfo(context, document, 'gts');
          if (!info) {
            return;
          }

          const virtualCode = info.root;
          const text = document.getText();
          const transformedModule = virtualCode.transformedModule;

          if (!transformedModule) {
            return;
          }

          const cursorOffset = document.offsetAt(range.start);
          const actions: vscode.CodeAction[] = [];

          // Find all template regions
          const templateSpans = transformedModule.correlatedSpans.filter(
            (span) => span.glimmerAstMapping,
          );

          for (const span of templateSpans) {
            const templateStart = span.originalStart;
            const templateEnd = span.originalStart + span.originalLength;

            // Check if cursor is within or near this template's component
            const classInfo = findEnclosingClassComponent(text, templateStart);
            const templateOnlyInfo = findTemplateOnlyComponent(text, templateStart, templateEnd);

            if (classInfo && cursorOffset >= classInfo.fullStart && cursorOffset <= classInfo.fullEnd) {
              // Cursor is in a class component — offer conversion to template-only
              const action = buildClassToTemplateOnlyAction(
                document,
                text,
                classInfo,
                templateStart,
                templateEnd,
              );
              if (action) {
                actions.push(action);
              }
            } else if (
              templateOnlyInfo &&
              cursorOffset >= templateOnlyInfo.fullStart &&
              cursorOffset <= templateOnlyInfo.fullEnd
            ) {
              // Cursor is in a template-only component — offer conversion to class
              const action = buildTemplateOnlyToClassAction(
                document,
                text,
                templateOnlyInfo,
                templateStart,
                templateEnd,
              );
              if (action) {
                actions.push(action);
              }
            }
          }

          return actions;
        },
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Detection helpers
// ---------------------------------------------------------------------------

interface ClassComponentInfo {
  /** Offset of the start of the full class declaration (including `export default` if present) */
  fullStart: number;
  /** Offset of the end of the class declaration (closing `}`) */
  fullEnd: number;
  /** The class name, e.g. "Greeting" */
  className: string;
  /** Whether the class is exported as `export default` */
  isDefaultExport: boolean;
  /** Whether the class is exported as `export` (named) */
  isNamedExport: boolean;
  /** The signature type parameter, e.g. "GreetingSignature" or "{ Args: { name: string } }" */
  signatureType: string | null;
  /** The base class name, e.g. "Component" */
  baseClass: string;
  /** The import source for the base class, e.g. "@glimmer/component" */
  baseClassImport: string | null;
  /** Whether the class body contains members other than `<template>` */
  hasOtherMembers: boolean;
  /** The text of the class body between opening `{` and closing `}`, trimmed of the template */
  otherMembersText: string;
}

interface TemplateOnlyComponentInfo {
  /** Offset of the start of the full declaration */
  fullStart: number;
  /** Offset of the end of the full declaration (including trailing semicolon) */
  fullEnd: number;
  /** Variable name if assigned, e.g. "Foo" in `const Foo: TOC<Sig> = <template>...</template>` */
  variableName: string | null;
  /** Whether this is `export default <template>...</template>` */
  isDefaultExport: boolean;
  /** Whether the const is exported, e.g. `export const Foo = ...` */
  isNamedExport: boolean;
  /** The signature type from TOC annotation, e.g. "{ Args: { name: string } }" */
  signatureType: string | null;
}

/**
 * Given the full text and the start offset of a `<template>` tag, determines if it is
 * inside a class that extends Component (or a similar base class). Returns info about
 * the enclosing class or `null` if the template is not inside a class.
 */
function findEnclosingClassComponent(
  text: string,
  templateStart: number,
): ClassComponentInfo | null {
  // Work backwards from the template to find the enclosing class declaration.
  // We look for a pattern like: [export [default]] class Foo extends Component[<Sig>] {
  const textBefore = text.slice(0, templateStart);

  // Find the nearest opening brace that could be a class body.
  // We need to count braces to find the matching class opening brace.
  let braceDepth = 0;
  let classBodyOpenIndex = -1;

  for (let i = textBefore.length - 1; i >= 0; i--) {
    const ch = textBefore[i];
    if (ch === '}') {
      braceDepth++;
    } else if (ch === '{') {
      if (braceDepth === 0) {
        classBodyOpenIndex = i;
        break;
      }
      braceDepth--;
    }
  }

  if (classBodyOpenIndex === -1) {
    return null;
  }

  // Now look at the text before the opening brace to see if it's a class declaration
  const textBeforeBrace = text.slice(0, classBodyOpenIndex).trimEnd();

  // Match: [export [default]] class ClassName extends BaseClass[<Sig>]
  // The signature may contain nested angle brackets, so we need a more careful match
  const classPattern =
    /(?:(export)\s+)?(?:(default)\s+)?class\s+(\w+)\s+extends\s+(\w+)(?:<([\s\S]*)>)?\s*$/;
  const classMatch = textBeforeBrace.match(classPattern);

  if (!classMatch) {
    return null;
  }

  const isNamedExport = !!classMatch[1] && !classMatch[2];
  const isDefaultExport = !!classMatch[1] && !!classMatch[2];
  const className = classMatch[3];
  const baseClass = classMatch[4];
  const rawSignatureType = classMatch[5] ?? null;

  // Balance angle brackets for the signature type (it may contain nested generics)
  const signatureType = rawSignatureType ? balanceAngleBrackets(rawSignatureType) : null;

  // Recalculate the full start including export/default keywords
  const declarationText = classMatch[0];
  const fullStart = textBeforeBrace.length - declarationText.length;

  // Find the closing brace of the class body
  const textFromBrace = text.slice(classBodyOpenIndex);
  let depth = 0;
  let classBodyCloseIndex = -1;

  for (let i = 0; i < textFromBrace.length; i++) {
    const ch = textFromBrace[i];
    // Skip string literals and template literals to avoid counting braces inside them
    if (ch === "'" || ch === '"' || ch === '`') {
      const quote = ch;
      i++;
      while (i < textFromBrace.length) {
        if (textFromBrace[i] === '\\') {
          i++; // skip escaped char
        } else if (textFromBrace[i] === quote) {
          break;
        }
        i++;
      }
      continue;
    }
    if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) {
        classBodyCloseIndex = classBodyOpenIndex + i;
        break;
      }
    }
  }

  if (classBodyCloseIndex === -1) {
    return null;
  }

  const fullEnd = classBodyCloseIndex + 1; // include the closing brace

  // Determine base class import
  const baseClassImport = findImportSource(text, baseClass);

  // Determine if the class body has other members besides <template>
  const classBodyText = text.slice(classBodyOpenIndex + 1, classBodyCloseIndex);
  const otherMembersText = removeTemplateFromClassBody(classBodyText, templateStart - classBodyOpenIndex - 1);
  const hasOtherMembers = otherMembersText.trim().length > 0;

  return {
    fullStart,
    fullEnd,
    className,
    isDefaultExport,
    isNamedExport,
    signatureType,
    baseClass,
    baseClassImport,
    hasOtherMembers,
    otherMembersText,
  };
}

/**
 * Given the full text and the start/end offset of a `<template>` tag, determines if it is
 * a standalone template-only component (not inside a class). Returns info about the
 * template-only component or `null` if the template is inside a class.
 */
function findTemplateOnlyComponent(
  text: string,
  templateStart: number,
  templateEnd: number,
): TemplateOnlyComponentInfo | null {
  // If this template is inside a class, it's not template-only
  if (findEnclosingClassComponent(text, templateStart)) {
    return null;
  }

  const textBefore = text.slice(0, templateStart).trimEnd();

  // Pattern 1: `export default <template>...</template>`
  const defaultExportPattern = /(?:^|\n)\s*(export\s+default)\s*$/;
  const defaultExportMatch = textBefore.match(defaultExportPattern);

  if (defaultExportMatch) {
    const fullStart = textBefore.lastIndexOf(defaultExportMatch[1]);
    let fullEnd = templateEnd;
    // Check for trailing semicolon
    const afterTemplate = text.slice(templateEnd);
    if (afterTemplate.match(/^\s*;/)) {
      fullEnd = templateEnd + afterTemplate.indexOf(';') + 1;
    }

    return {
      fullStart,
      fullEnd,
      variableName: null,
      isDefaultExport: true,
      isNamedExport: false,
      signatureType: null,
    };
  }

  // Pattern 2: `[export] const Foo[: TOC<Sig>] = <template>...</template>`
  const constPattern = /(?:^|\n)\s*((?:export\s+)?const\s+(\w+)\s*(?::\s*TOC<([\s\S]*?)>)?\s*=)\s*$/;
  const constMatch = textBefore.match(constPattern);

  if (constMatch) {
    const fullDeclaration = constMatch[1];
    const fullStart = textBefore.lastIndexOf(fullDeclaration);
    let fullEnd = templateEnd;
    // Check for trailing semicolon
    const afterTemplate = text.slice(templateEnd);
    if (afterTemplate.match(/^\s*;/)) {
      fullEnd = templateEnd + afterTemplate.indexOf(';') + 1;
    }

    const variableName = constMatch[2];
    const isNamedExport = fullDeclaration.startsWith('export');
    const rawSig = constMatch[3] ?? null;
    const signatureType = rawSig ? balanceAngleBrackets(rawSig) : null;

    return {
      fullStart,
      fullEnd,
      variableName,
      isDefaultExport: false,
      isNamedExport,
      signatureType,
    };
  }

  // Pattern 3: bare `<template>...</template>` at module level
  // This is a default export template-only component
  const lineStart = textBefore.lastIndexOf('\n') + 1;
  const lineText = text.slice(lineStart, templateStart).trim();

  if (lineText === '') {
    let fullEnd = templateEnd;
    const afterTemplate = text.slice(templateEnd);
    if (afterTemplate.match(/^\s*;/)) {
      fullEnd = templateEnd + afterTemplate.indexOf(';') + 1;
    }

    return {
      fullStart: templateStart,
      fullEnd,
      variableName: null,
      isDefaultExport: false,
      isNamedExport: false,
      signatureType: null,
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Code action builders
// ---------------------------------------------------------------------------

function buildClassToTemplateOnlyAction(
  document: { uri: string; positionAt(offset: number): vscode.Position },
  text: string,
  classInfo: ClassComponentInfo,
  templateStart: number,
  templateEnd: number,
): vscode.CodeAction | null {
  // If the class has other members (properties, methods), we can't safely convert.
  // We still offer the action but mark it as disabled with a reason.
  if (classInfo.hasOtherMembers) {
    return {
      title: 'Convert to template-only component',
      kind: 'refactor.rewrite' as vscode.CodeActionKind,
      disabled: {
        reason:
          'This class component has properties or methods besides <template>. ' +
          'Remove them before converting to a template-only component.',
      },
    };
  }

  const templateContent = text.slice(templateStart, templateEnd);
  const edits: vscode.TextEdit[] = [];

  // Build the replacement text
  let replacement: string;

  if (classInfo.isDefaultExport) {
    // `export default class Foo extends Component<Sig> { <template>...</template> }`
    // → `export default <template>...</template>` (no sig)
    // → `export default <template>...</template> as ComponentLike<Sig>;` (with sig)
    if (classInfo.signatureType) {
      replacement = `export default ${templateContent} as ComponentLike<${classInfo.signatureType}>;`;
    } else {
      replacement = `export default ${templateContent}`;
    }
  } else if (classInfo.isNamedExport) {
    // `export class Foo extends Component<Sig> { <template>...</template> }`
    // → `export const Foo = <template>...</template>;`
    if (classInfo.signatureType) {
      replacement = `export const ${classInfo.className}: TOC<${classInfo.signatureType}> = ${templateContent};`;
    } else {
      replacement = `export const ${classInfo.className} = ${templateContent};`;
    }
  } else {
    // `class Foo extends Component<Sig> { <template>...</template> }`
    // → `const Foo = <template>...</template>;`
    if (classInfo.signatureType) {
      replacement = `const ${classInfo.className}: TOC<${classInfo.signatureType}> = ${templateContent};`;
    } else {
      replacement = `const ${classInfo.className} = ${templateContent};`;
    }
  }

  edits.push({
    range: {
      start: document.positionAt(classInfo.fullStart),
      end: document.positionAt(classInfo.fullEnd),
    },
    newText: replacement,
  });

  // Handle import changes:
  // 1. Remove the Component import if no longer used
  // 2. Add TOC import if we're using it (non-default-export with signature)
  const importEdits = buildImportEditsForClassToTemplateOnly(
    document,
    text,
    classInfo,
  );
  edits.push(...importEdits);

  return {
    title: 'Convert to template-only component',
    kind: 'refactor.rewrite' as vscode.CodeActionKind,
    edit: {
      changes: {
        [document.uri]: edits,
      },
    },
  };
}

function buildTemplateOnlyToClassAction(
  document: { uri: string; positionAt(offset: number): vscode.Position },
  text: string,
  templateOnlyInfo: TemplateOnlyComponentInfo,
  templateStart: number,
  templateEnd: number,
): vscode.CodeAction | null {
  const templateContent = text.slice(templateStart, templateEnd);
  const edits: vscode.TextEdit[] = [];

  // Determine class name
  const className = templateOnlyInfo.variableName ?? 'MyComponent';
  const signaturePart = templateOnlyInfo.signatureType
    ? `<${templateOnlyInfo.signatureType}>`
    : '';

  // Build class replacement
  let replacement: string;

  // Determine indentation for the template inside the class
  const indentedTemplate = indentBlock(templateContent, '  ');

  if (templateOnlyInfo.isDefaultExport || (!templateOnlyInfo.variableName && !templateOnlyInfo.isNamedExport)) {
    // `export default <template>...</template>`
    // or bare `<template>...</template>`
    // → `export default class ClassName extends Component<Sig> { <template>...</template> }`
    replacement = `export default class ${className} extends Component${signaturePart} {\n${indentedTemplate}\n}`;
  } else if (templateOnlyInfo.isNamedExport) {
    // `export const Foo: TOC<Sig> = <template>...</template>;`
    // → `export class Foo extends Component<Sig> { <template>...</template> }`
    replacement = `export class ${className} extends Component${signaturePart} {\n${indentedTemplate}\n}`;
  } else {
    // `const Foo: TOC<Sig> = <template>...</template>;`
    // → `class Foo extends Component<Sig> { <template>...</template> }`
    replacement = `class ${className} extends Component${signaturePart} {\n${indentedTemplate}\n}`;
  }

  edits.push({
    range: {
      start: document.positionAt(templateOnlyInfo.fullStart),
      end: document.positionAt(templateOnlyInfo.fullEnd),
    },
    newText: replacement,
  });

  // Handle import changes:
  // 1. Add Component import if not present
  // 2. Remove TOC import if no longer used
  const importEdits = buildImportEditsForTemplateOnlyToClass(
    document,
    text,
    templateOnlyInfo,
  );
  edits.push(...importEdits);

  return {
    title: 'Convert to class component',
    kind: 'refactor.rewrite' as vscode.CodeActionKind,
    edit: {
      changes: {
        [document.uri]: edits,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Import management helpers
// ---------------------------------------------------------------------------

/**
 * Find the import source for a given identifier, e.g. `Component` → `@glimmer/component`.
 */
function findImportSource(text: string, identifier: string): string | null {
  // Match: import [type] Identifier from 'source'
  // or: import [type] { ... Identifier ... } from 'source'
  const defaultImportPattern = new RegExp(
    `import\\s+(?:type\\s+)?${escapeRegExp(identifier)}\\s+from\\s+['"]([^'"]+)['"]`,
  );
  const defaultMatch = text.match(defaultImportPattern);
  if (defaultMatch) {
    return defaultMatch[1];
  }

  const namedImportPattern = new RegExp(
    `import\\s+(?:type\\s+)?\\{[^}]*\\b${escapeRegExp(identifier)}\\b[^}]*\\}\\s+from\\s+['"]([^'"]+)['"]`,
  );
  const namedMatch = text.match(namedImportPattern);
  if (namedMatch) {
    return namedMatch[1];
  }

  return null;
}

/**
 * Find the full import statement for a given identifier.
 * Returns the start offset, end offset, and the matched text.
 */
function findImportStatement(
  text: string,
  identifier: string,
): { start: number; end: number; text: string; isDefault: boolean; isTypeOnly: boolean } | null {
  // Default import: import [type] Identifier from 'source'
  const defaultPattern = new RegExp(
    `import\\s+(type\\s+)?${escapeRegExp(identifier)}\\s+from\\s+['"][^'"]+['"]\\s*;?`,
    'g',
  );
  const defaultMatch = defaultPattern.exec(text);
  if (defaultMatch) {
    return {
      start: defaultMatch.index,
      end: defaultMatch.index + defaultMatch[0].length,
      text: defaultMatch[0],
      isDefault: true,
      isTypeOnly: !!defaultMatch[1],
    };
  }

  // Named import: import [type] { ..., Identifier, ... } from 'source'
  const namedPattern = new RegExp(
    `import\\s+(type\\s+)?\\{[^}]*\\b${escapeRegExp(identifier)}\\b[^}]*\\}\\s+from\\s+['"][^'"]+['"]\\s*;?`,
    'g',
  );
  const namedMatch = namedPattern.exec(text);
  if (namedMatch) {
    return {
      start: namedMatch.index,
      end: namedMatch.index + namedMatch[0].length,
      text: namedMatch[0],
      isDefault: false,
      isTypeOnly: !!namedMatch[1],
    };
  }

  return null;
}

/**
 * Count how many times an identifier is used in the text (excluding import statements).
 */
function countUsages(text: string, identifier: string): number {
  // Remove import lines to avoid counting them
  const withoutImports = text.replace(/^import\s+.*$/gm, '');
  const pattern = new RegExp(`\\b${escapeRegExp(identifier)}\\b`, 'g');
  const matches = withoutImports.match(pattern);
  return matches ? matches.length : 0;
}

function buildImportEditsForClassToTemplateOnly(
  document: { uri: string; positionAt(offset: number): vscode.Position },
  text: string,
  classInfo: ClassComponentInfo,
): vscode.TextEdit[] {
  const edits: vscode.TextEdit[] = [];

  // Check if we need to remove the Component import
  // Count usages of the base class, excluding the class we're removing
  const baseClassUsages = countUsages(text, classInfo.baseClass);
  // The class declaration itself is one usage, so if there's only 1, we can remove the import
  if (baseClassUsages <= 1 && classInfo.baseClassImport) {
    const importStmt = findImportStatement(text, classInfo.baseClass);
    if (importStmt) {
      // Remove the entire import line (including trailing newline)
      let end = importStmt.end;
      if (text[end] === '\n') end++;

      edits.push({
        range: {
          start: document.positionAt(importStmt.start),
          end: document.positionAt(end),
        },
        newText: '',
      });
    }
  }

  // Add type import if needed for the signature
  if (classInfo.signatureType) {
    if (classInfo.isDefaultExport) {
      // Default export with signature uses `as ComponentLike<Sig>`
      const existingImport = findImportStatement(text, 'ComponentLike');
      if (!existingImport) {
        const insertPosition = findImportInsertPosition(text);
        edits.push({
          range: {
            start: document.positionAt(insertPosition),
            end: document.positionAt(insertPosition),
          },
          // Leading \n preserves blank-line separation when the old Component import is removed
          newText: "\nimport type { ComponentLike } from '@glint/template';\n",
        });
      }
    } else {
      // Named/non-exported uses TOC<Sig> annotation
      const existingTocImport = findImportStatement(text, 'TOC');
      if (!existingTocImport) {
        const insertPosition = findImportInsertPosition(text);
        edits.push({
          range: {
            start: document.positionAt(insertPosition),
            end: document.positionAt(insertPosition),
          },
          newText: "import type { TOC } from '@ember/component/template-only';\n",
        });
      }
    }
  }

  return edits;
}

function buildImportEditsForTemplateOnlyToClass(
  document: { uri: string; positionAt(offset: number): vscode.Position },
  text: string,
  templateOnlyInfo: TemplateOnlyComponentInfo,
): vscode.TextEdit[] {
  const edits: vscode.TextEdit[] = [];

  // Add Component import if not present
  const existingComponentImport = findImportStatement(text, 'Component');
  if (!existingComponentImport) {
    const insertPosition = findImportInsertPosition(text);
    edits.push({
      range: {
        start: document.positionAt(insertPosition),
        end: document.positionAt(insertPosition),
      },
      newText: "import Component from '@glimmer/component';\n",
    });
  }

  // Check if we should remove the TOC import
  if (templateOnlyInfo.signatureType) {
    const tocUsages = countUsages(text, 'TOC');
    // The declaration we're replacing is one usage; if it's the only one, remove the import
    if (tocUsages <= 1) {
      const tocImport = findImportStatement(text, 'TOC');
      if (tocImport) {
        let end = tocImport.end;
        if (text[end] === '\n') end++;

        edits.push({
          range: {
            start: document.positionAt(tocImport.start),
            end: document.positionAt(end),
          },
          newText: '',
        });
      }
    }
  }

  return edits;
}

/**
 * Find the position after the last import statement, suitable for inserting a new import.
 */
function findImportInsertPosition(text: string): number {
  const importPattern = /^import\s+.*$/gm;
  let lastImportEnd = 0;
  let match: RegExpExecArray | null;

  while ((match = importPattern.exec(text)) !== null) {
    lastImportEnd = match.index + match[0].length;
    // Include the newline after the import
    if (text[lastImportEnd] === '\n') {
      lastImportEnd++;
    }
  }

  return lastImportEnd;
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

/**
 * Remove the <template>...</template> content from a class body text and return
 * the remaining members. `templateOffset` is the offset of the template start
 * relative to the start of the class body (after the opening `{`).
 */
function removeTemplateFromClassBody(classBody: string, templateOffset: number): string {
  // Find the <template>...</template> within the class body
  const templateStart = classBody.indexOf('<template>', Math.max(0, templateOffset - 10));
  if (templateStart === -1) {
    return classBody;
  }

  const templateEndTag = '</template>';
  const templateEnd = classBody.indexOf(templateEndTag, templateStart);
  if (templateEnd === -1) {
    return classBody;
  }

  const beforeTemplate = classBody.slice(0, templateStart);
  const afterTemplate = classBody.slice(templateEnd + templateEndTag.length);

  return (beforeTemplate + afterTemplate).trim();
}

/**
 * Balance angle brackets in a type expression. If the input is the contents between
 * the first `<` and the text, this ensures nested generics are properly captured.
 */
function balanceAngleBrackets(text: string): string {
  let depth = 1; // We've already consumed the opening `<`
  let i = 0;

  while (i < text.length && depth > 0) {
    if (text[i] === '<') depth++;
    else if (text[i] === '>') depth--;
    if (depth > 0) i++;
  }

  return text.slice(0, i);
}

/**
 * Add indentation to each line of a block of text.
 */
function indentBlock(text: string, indent: string): string {
  return text
    .split('\n')
    .map((line) => (line.trim() === '' ? '' : indent + line))
    .join('\n');
}

/**
 * Escape special regex characters in a string.
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
