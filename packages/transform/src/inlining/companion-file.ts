import { NodePath, types as t } from '@babel/core';
import { GlintEnvironment } from '@glint/config';
import { CorrelatedSpansResult, getContainingTypeInfo, PartialCorrelatedSpan } from '.';
import MappingTree, { ParseError } from '../mapping-tree';
import { templateToTypescript } from '../template-to-typescript';
import { SourceFile, TransformError } from '../transformed-module';
import { assert } from '../util';

const STANDALONE_TEMPLATE_FIELD = `'~template'`;

export function calculateCompanionTemplateSpans(
  path: NodePath<t.Class> | NodePath<t.Expression>,
  script: SourceFile,
  template: SourceFile,
  environment: GlintEnvironment
): CorrelatedSpansResult {
  let errors: Array<TransformError> = [];
  let partialSpans: Array<PartialCorrelatedSpan> = [];
  let typesPath = environment.getTypesForStandaloneTemplate();
  if (!typesPath) {
    errors.push({
      source: template,
      location: { start: 0, end: template.contents.length },
      message: `Glint environment ${environment.name} does not support standalone template files`,
    });

    return { errors, partialSpans };
  }

  let targetPath = findCompanionTemplateTarget(path);
  if (!targetPath) {
    errors.push({
      message: `Unable to resolve a class body to associate a template declaration to`,
      source: script,
      location: {
        start: path.node.start ?? 0,
        end: path.node.end ?? script.contents.length,
      },
    });

    return { errors, partialSpans };
  }

  let target = targetPath.node;

  assert(target.start && target.end, 'Missing location info');

  if (targetPath.isClass()) {
    let { className, contextType, typeParams } = getContainingTypeInfo(targetPath);
    if (!className) {
      errors.push({
        source: script,
        location: { start: target.start, end: target.end },
        message: 'Classes with an associated template must have a name',
      });
    }

    let transformedTemplate = templateToTypescript(template.contents, {
      typesPath,
      contextType,
      typeParams,
    });

    errors.push(
      ...transformedTemplate.errors.map(({ message, location }) => ({
        message,
        location: location ?? { start: 0, end: template.contents.length },
        source: template,
      }))
    );

    if (transformedTemplate.result) {
      partialSpans.push(
        {
          originalFile: template,
          originalStart: 0,
          originalLength: 0,
          insertionPoint: target.end - 1,
          transformedSource: `protected static ${STANDALONE_TEMPLATE_FIELD} = `,
        },
        {
          originalFile: template,
          originalStart: 0,
          originalLength: template.contents.length,
          insertionPoint: target.end - 1,
          transformedSource: transformedTemplate.result.code,
          mapping: transformedTemplate.result.mapping,
        },
        {
          originalFile: template,
          originalStart: template.contents.length - 1,
          originalLength: 0,
          insertionPoint: target.end - 1,
          transformedSource: `;\n`,
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
        insertionPoint: target.end - 1,
        transformedSource: '',
        mapping,
      });
    }
  } else {
    // TODO: handle opaque expression like an imported identifier or `templateOnlyComponent()`
  }

  return { errors, partialSpans };
}

type CompanionTemplateTarget = NodePath<t.Class> | NodePath<t.Expression> | null;

function findCompanionTemplateTarget(
  declaration: NodePath<t.Class> | NodePath<t.Expression>
): CompanionTemplateTarget {
  let value = declaration.isIdentifier()
    ? declaration.scope.getBinding(declaration.node.name)?.path
    : declaration;

  if (value?.isClass() || value?.isExpression()) {
    return value;
  }

  return null;
}
