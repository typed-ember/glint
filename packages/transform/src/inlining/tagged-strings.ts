import { NodePath, types as t } from '@babel/core';
import { GlintEnvironment } from '@glint/config';
import { CorrelatedSpansResult, getContainingTypeInfo, PartialCorrelatedSpan } from '.';
import { templateToTypescript } from '../template-to-typescript';
import { SourceFile, TransformError } from '../transformed-module';
import { assert } from '../util';

export function calculateTaggedTemplateSpans(
  path: NodePath<t.TaggedTemplateExpression>,
  script: SourceFile,
  environment: GlintEnvironment
): CorrelatedSpansResult {
  let errors: Array<TransformError> = [];
  let partialSpans: Array<PartialCorrelatedSpan> = [];
  let tag = path.get('tag');

  if (!tag.isIdentifier()) {
    return { errors, partialSpans };
  }

  let typesPath = determineTypesPathForTag(tag, environment);
  if (typesPath) {
    let tagName = tag.node.name;
    let { quasis } = path.node.quasi;

    assert(quasis.length === 1, 'No interpolated values in template strings');
    assert(path.node.start, 'Missing location info');
    assert(path.node.end, 'Missing location info');

    // Pad the template to account for the tag and surrounding ` characters
    let template = `${''.padStart(tagName.length)} ${quasis[0].value.raw} `;

    // Emit a use of the template tag so it's not considered unused
    let preamble = [`${tagName};`];

    let identifiersInScope = Object.keys(path.scope.getAllBindings());
    let { typeParams, contextType } = getContainingTypeInfo(path);
    let transformedTemplate = templateToTypescript(template, {
      typesPath,
      preamble,
      identifiersInScope,
      typeParams,
      contextType,
    });

    if (!contextType) {
      errors.push({
        source: script,
        message: 'Classes containing templates must have a name',
        location: {
          start: path.node.start,
          end: path.node.end,
        },
      });
    }

    for (let { message, location } of transformedTemplate.errors) {
      if (location) {
        errors.push({
          source: script,
          message,
          location: {
            start: path.node.start + location.start,
            end: path.node.start + location.end,
          },
        });
      } else {
        assert(path.node.tag.start, 'Missing location info');
        assert(path.node.tag.end, 'Missing location info');

        errors.push({
          source: script,
          message,
          location: {
            start: path.node.tag.start,
            end: path.node.tag.end,
          },
        });
      }
    }

    if (transformedTemplate.result) {
      let { code, mapping } = transformedTemplate.result;

      partialSpans.push({
        originalFile: script,
        originalStart: path.node.start,
        originalLength: path.node.end - path.node.start,
        insertionPoint: path.node.start,
        transformedSource: code,
        mapping: mapping,
      });
    }
  }

  return { errors, partialSpans };
}

function determineTypesPathForTag(
  path: NodePath<t.Identifier>,
  environment: GlintEnvironment
): string | undefined {
  for (let [importSource, tags] of Object.entries(environment.getConfiguredTemplateTags())) {
    for (let [importSpecifier, tagConfig] of Object.entries(tags)) {
      if (path.referencesImport(importSource, importSpecifier)) {
        return tagConfig.typesSource;
      }
    }
  }
}
