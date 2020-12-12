import { NodePath, types as t } from '@babel/core';
import { GlintEnvironment } from '@glint/config';
import { CorrelatedSpansResult, getContainingTypeInfo, PartialCorrelatedSpan } from '.';
import { templateToTypescript } from '../template-to-typescript';
import { SourceFile, TransformError } from '../transformed-module';
import { assert } from '../util';

const STANDALONE_TEMPLATE_FIELD = `'~template'`;

export function calculateCompanionTemplateSpans(
  path: NodePath<t.ExportDefaultDeclaration>,
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
      source: script,
      location: { start: 0, end: script.contents.length },
      message: `Modules with an associated template must have a default export`,
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

    let preamble = [];
    if (className) {
      preamble.push(`${className}[${STANDALONE_TEMPLATE_FIELD}];`);
    }

    let transformedTemplate = templateToTypescript(template.contents, {
      typesPath,
      contextType,
      typeParams,
      preamble,
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
          transformedSource: `private static ${STANDALONE_TEMPLATE_FIELD} = `,
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
    }
  } else {
    // TODO: handle opaque expression like an imported identifier or `templateOnlyComponent()`
  }

  return { errors, partialSpans };
}

type CompanionTemplateTarget = NodePath<t.Class> | NodePath<t.Expression> | null;

function findCompanionTemplateTarget(
  path: NodePath<t.ExportDefaultDeclaration>
): CompanionTemplateTarget {
  let declaration = path.get('declaration');
  let value = declaration.isIdentifier()
    ? path.scope.getBinding(declaration.node.name)?.path
    : declaration;

  if (value?.isClass() || value?.isExpression()) {
    return value;
  }

  return null;
}
