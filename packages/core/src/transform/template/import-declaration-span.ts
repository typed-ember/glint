import * as ts from 'typescript';
import { TSLib } from '../util.js';
import { CorrelatedSpansResult, PartialCorrelatedSpan } from './inlining/index.js';
import { Directive, SourceFile, TransformError } from './transformed-module.js';
import { GlintEmitMetadata } from '@glint/core/config-types';
import MappingTree, { GtsImport } from './mapping-tree.js';

export function calculateImportSpan(
  ts: TSLib,
  node: ts.ImportDeclaration,
  meta: GlintEmitMetadata | undefined,
  script: SourceFile,
  printer: ts.Printer
): CorrelatedSpansResult {
  let directives: Array<Directive> = [];
  let errors: Array<TransformError> = [];
  let partialSpans: Array<PartialCorrelatedSpan> = [];
  let moduleSpecifierText = (node.moduleSpecifier as ts.StringLiteral).text;
  if (meta?.replaceExtension) {
    let newModuleSpecifier = ts.factory.createStringLiteral(
      moduleSpecifierText.replace(/\.gts$/, '.' + meta.replaceExtension)
    );
    let updatedNode = ts.factory.updateImportDeclaration(
      node,
      node.modifiers,
      node.importClause,
      newModuleSpecifier,
      node.assertClause
    );
    let originalStart = node.getStart();
    let originalLength = node.getEnd() - originalStart;
    let transformedSource = printer.printNode(
      ts.EmitHint.Unspecified,
      updatedNode,
      node.getSourceFile()
    );
    partialSpans.push({
      originalFile: script,
      originalStart,
      originalLength,
      insertionPoint: originalStart,
      transformedSource,
      mapping: new MappingTree(
        { start: 0, end: transformedSource.length },
        { start: 0, end: originalLength },
        [],
        new GtsImport()
      ),
    });
  }

  return { errors, directives, partialSpans };
}
