import path from 'path';
import { NodePath, types as t } from '@babel/core';
import { GlintEnvironment } from '@glint/config';
import { CorrelatedSpansResult, getContainingTypeInfo, PartialCorrelatedSpan } from '.';
import { RewriteResult } from '../map-template-contents';
import MappingTree, { ParseError } from '../mapping-tree';
import { templateToTypescript } from '../template-to-typescript';
import { Directive, SourceFile, TransformError } from '../transformed-module';
import { assert, isJsScript } from '../util';

export function calculateCompanionTemplateSpans(
  exportDeclarationPath: NodePath | null,
  script: SourceFile,
  template: SourceFile,
  environment: GlintEnvironment
): CorrelatedSpansResult {
  let errors: Array<TransformError> = [];
  let directives: Array<Directive> = [];
  let partialSpans: Array<PartialCorrelatedSpan> = [];
  let typesPath = environment.getTypesForStandaloneTemplate();
  if (!typesPath) {
    errors.push({
      source: template,
      location: { start: 0, end: template.contents.length },
      message: `Glint environment ${environment.name} does not support standalone template files`,
    });

    return { errors, directives, partialSpans };
  }

  let targetPath = findCompanionTemplateTarget(exportDeclarationPath);
  if (targetPath?.isClass()) {
    let { className, contextType, typeParams } = getContainingTypeInfo(targetPath);
    let target = targetPath.node as t.Class;

    assert(target.start && target.end, 'Missing location info');

    if (!className) {
      errors.push({
        source: script,
        location: { start: target.start, end: target.end },
        message: 'Classes with an associated template must have a name',
      });
    }

    let rewriteResult = templateToTypescript(template.contents, {
      typesPath,
      contextType,
      typeParams,
      useJsDoc: isJsScript(script.filename),
    });

    // This allows us to avoid issues with `noImplicitOverride` for subclassed components,
    // but is ultimately kind of a kludge. TS 4.4 will support class static blocks, at
    // which point we won't need to invent a field at all and we can remove this.
    let standaloneTemplateField = `'~template:${className}'`;

    pushTransformedTemplate(rewriteResult, {
      insertionPoint: target.end - 1,
      prefix: `protected static ${standaloneTemplateField} = `,
      suffix: ';\n',
    });
  } else {
    let contextType: string | undefined;
    if (targetPath) {
      let moduleName = path.basename(script.filename, path.extname(script.filename));
      contextType = `typeof import('./${moduleName}').default`;
    }

    let rewriteResult = templateToTypescript(template.contents, { typesPath, contextType });

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

type CompanionTemplateTarget = NodePath<any> | null | undefined;

function findCompanionTemplateTarget(declaration: NodePath | null): CompanionTemplateTarget {
  return declaration?.isIdentifier()
    ? declaration.scope.getBinding(declaration.node.name)?.path
    : declaration;
}
