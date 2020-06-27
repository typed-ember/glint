import type tslib from 'typescript/lib/tsserverlibrary';

export function isAutoImportChange(change: ts.TextChange): boolean {
  return change.newText.startsWith('import');
}

export function rewriteAutoImportChange(
  ts: typeof tslib,
  change: ts.TextChange,
  sourceFile: ts.SourceFile
): ts.TextChange {
  let importPath = getImportPath(ts, change.newText);
  if (!importPath) return change;

  let existingImport = findExistingImport(ts, importPath, sourceFile);
  if (!existingImport) return change;

  let combinedImport = synthesizeCombinedImport(ts, existingImport.text, change.newText);
  if (!combinedImport) return change;

  return {
    newText: combinedImport,
    span: existingImport.span,
  };
}

function findExistingImport(
  ts: typeof tslib,
  path: string,
  sourceFile: ts.SourceFile
): { text: string; span: ts.TextSpan } | undefined {
  let importDeclaration = sourceFile.statements.find(
    (statement): statement is ts.ImportDeclaration => {
      return (
        ts.isImportDeclaration(statement) &&
        ts.isStringLiteral(statement.moduleSpecifier) &&
        statement.moduleSpecifier.text === path
      );
    }
  );

  if (importDeclaration) {
    let text = importDeclaration.getText(sourceFile);
    let start = importDeclaration.getStart(sourceFile);
    let length = importDeclaration.getEnd() - start;
    return { text, span: { start, length } };
  }
}

function getImportPath(ts: typeof tslib, text: string): string | undefined {
  try {
    let file = ts.createSourceFile('import.ts', text, ts.ScriptTarget.Latest);
    if (file.statements.length === 1) {
      let statement = file.statements[0];
      if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
        return statement.moduleSpecifier.text;
      }
    }
  } catch {
    // Fall through and return undefined
  }
}

function synthesizeCombinedImport(
  ts: typeof tslib,
  oldImportText: string,
  newImportText: string
): string | undefined {
  let parsed = parseImportsTogether(ts, oldImportText, newImportText);
  if (!parsed) return;

  let { oldImport, newImport, sourceFile } = parsed;
  let newName = newImport.importClause?.name;
  let oldName = oldImport.importClause?.name;

  let name: ts.Identifier | undefined;
  if (!newName || !oldName) {
    name = newName ?? oldName;
  } else if (newName?.text === oldName?.text) {
    name = newName;
  } else {
    return;
  }

  let newBindings = newImport.importClause?.namedBindings;
  let oldBindings = oldImport.importClause?.namedBindings;

  let bindings: ts.NamedImports | ts.NamespaceImport | undefined;
  if (!oldBindings || !newBindings) {
    bindings = newBindings ?? oldBindings;
  } else if (ts.isNamedImports(oldBindings) && ts.isNamedImports(newBindings)) {
    bindings = ts.createNamedImports([
      ...(oldBindings?.elements ?? []),
      ...(newBindings?.elements ?? []),
    ]);
  } else if (ts.isNamespaceImport(oldBindings) && ts.isNamespaceImport(newBindings)) {
    if (oldBindings?.name.text !== newBindings?.name.text) {
      return;
    } else {
      bindings = oldBindings;
    }
  } else {
    return;
  }

  let combinedImport = ts.createImportDeclaration(
    oldImport.decorators,
    oldImport.modifiers,
    ts.createImportClause(
      name,
      bindings,
      oldImport.importClause?.isTypeOnly && newImport.importClause?.isTypeOnly
    ),
    oldImport.moduleSpecifier
  );

  let result = ts.createPrinter().printNode(ts.EmitHint.Unspecified, combinedImport, sourceFile);
  if (/'/.test(oldImportText)) {
    result = result.replace(/"/g, `'`);
  }
  return result;
}

function parseImportsTogether(
  ts: typeof tslib,
  oldImportText: string,
  newImportText: string
):
  | { oldImport: ts.ImportDeclaration; newImport: ts.ImportDeclaration; sourceFile: ts.SourceFile }
  | undefined {
  let sourceFile = ts.createSourceFile(
    'tmp.ts',
    `${oldImportText}\n${newImportText}`,
    ts.ScriptTarget.Latest
  );
  let [oldImport, newImport] = sourceFile.statements;
  if (ts.isImportDeclaration(oldImport) && ts.isImportDeclaration(newImport)) {
    return { oldImport, newImport, sourceFile };
  }
}
