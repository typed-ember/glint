import * as path from 'node:path';
import type * as ts from 'typescript';
import { GlintEnvironment } from '@glint/config';
import { CorrelatedSpansResult, isEmbeddedInClass, PartialCorrelatedSpan } from '.';
import { RewriteResult } from '../map-template-contents';
import MappingTree, { ParseError } from '../mapping-tree';
import { templateToTypescript } from '../template-to-typescript';
import { Directive, SourceFile, TransformError } from '../transformed-module';
import { TSLib } from '../../util';

export function calculateCompanionTemplateSpans(
  ts: TSLib,
  ast: ts.SourceFile,
  script: SourceFile,
  template: SourceFile,
  environment: GlintEnvironment
): CorrelatedSpansResult {
  let errors: Array<TransformError> = [];
  let directives: Array<Directive> = [];
  let partialSpans: Array<PartialCorrelatedSpan> = [];
  let typesModule = environment.getTypesForStandaloneTemplate();
  if (!typesModule) {
    errors.push({
      source: template,
      location: { start: 0, end: template.contents.length },
      message: `No active Glint environment (${environment.names.join(
        ', '
      )}) supports standalone template files`,
    });

    return { errors, directives, partialSpans };
  }

  let useJsDoc = environment.isUntypedScript(script.filename);
  let targetNode = findCompanionTemplateTarget(ts, ast);
  if (targetNode && ts.isClassLike(targetNode)) {
    let rewriteResult = templateToTypescript(template.contents, {
      typesModule,
      backingValue: isEmbeddedInClass(ts, targetNode) ? 'this' : undefined,
      useJsDoc,
    });

    pushTransformedTemplate(rewriteResult, {
      insertionPoint: targetNode.getEnd() - 1,
      prefix: `static {\n`,
      suffix: '}\n',
    });
  } else {
    let backingValue: string | undefined;
    if (targetNode) {
      let moduleName = path.basename(script.filename, path.extname(script.filename));
      backingValue = useJsDoc
        ? `(/** @type {typeof import('./${moduleName}').default} */ ({}))`
        : `({} as unknown as typeof import('./${moduleName}').default)`;
    }

    let rewriteResult = templateToTypescript(template.contents, {
      typesModule,
      backingValue,
      useJsDoc,
    });

    pushTransformedTemplate(rewriteResult, {
      insertionPoint: script.contents.length,
      prefix: '\n',
      suffix: ';\n',
    });
  }

  return { errors, directives, partialSpans };

  function pushTransformedTemplate(
    transformedTemplate: RewriteResult,
    options: {
      insertionPoint: number;
      prefix: string;
      suffix: string;
    }
  ): void {
    errors.push(
      ...transformedTemplate.errors.map(({ message, location }) => ({
        message,
        location: location ?? { start: 0, end: template.contents.length },
        source: template,
      }))
    );

    if (transformedTemplate.result) {
      directives.push(
        ...transformedTemplate.result.directives.map(({ kind, location, areaOfEffect }) => ({
          kind,
          location,
          areaOfEffect,
          source: template,
        }))
      );

      partialSpans.push(
        {
          originalFile: template,
          originalStart: 0,
          originalLength: 0,
          insertionPoint: options.insertionPoint,
          transformedSource: options.prefix,
        },
        {
          originalFile: template,
          originalStart: 0,
          originalLength: template.contents.length,
          insertionPoint: options.insertionPoint,
          transformedSource: transformedTemplate.result.code,
          mapping: transformedTemplate.result.mapping,
        },
        {
          originalFile: template,
          originalStart: template.contents.length - 1,
          originalLength: 0,
          insertionPoint: options.insertionPoint,
          transformedSource: options.suffix,
        }
      );
    } else {
      let mapping = new MappingTree(
        { start: 0, end: 0 },
        { start: 0, end: template.contents.length },
        [],
        new ParseError()
      );

      partialSpans.push({
        originalFile: template,
        originalStart: 0,
        originalLength: template.contents.length,
        insertionPoint: options.insertionPoint,
        transformedSource: '',
        mapping,
      });
    }
  }
}

function findCompanionTemplateTarget(
  ts: TSLib,
  sourceFile: ts.SourceFile
): ts.ClassLikeDeclaration | ts.Expression | null {
  let classes: Record<string, ts.ClassLikeDeclaration> = Object.create(null);
  for (let statement of sourceFile.statements) {
    if (ts.isClassLike(statement)) {
      let mods = statement.modifiers;
      if (
        mods?.some((mod) => mod.kind === ts.SyntaxKind.DefaultKeyword) &&
        mods.some((mod) => mod.kind === ts.SyntaxKind.ExportKeyword)
      ) {
        return statement;
      }

      if (statement.name) {
        classes[statement.name.text] = statement;
      }
    }
  }

  for (let statement of sourceFile.statements) {
    if (ts.isExportAssignment(statement) && !statement.isExportEquals) {
      if (ts.isIdentifier(statement.expression) && statement.expression.text in classes) {
        return classes[statement.expression.text];
      } else {
        return statement.expression;
      }
    }
  }

  return null;
}
