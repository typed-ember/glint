import { NodePath, types as t } from '@babel/core';
import { GlintEnvironment, GlintTagConfig } from '@glint/config';
import { CorrelatedSpansResult, getContainingTypeInfo, PartialCorrelatedSpan } from '.';
import { templateToTypescript } from '../template-to-typescript';
import { Directive, SourceFile, TransformError, Range } from '../transformed-module';
import { assert, isJsScript } from '../util';

export function calculateTaggedTemplateSpans(
  path: NodePath<t.TaggedTemplateExpression>,
  script: SourceFile,
  environment: GlintEnvironment
): CorrelatedSpansResult {
  let directives: Array<Directive> = [];
  let errors: Array<TransformError> = [];
  let partialSpans: Array<PartialCorrelatedSpan> = [];
  let tag = path.get('tag');

  if (!tag.isIdentifier()) {
    return { errors, directives, partialSpans };
  }

  let tagConfig = getConfigForTag(tag, environment);
  if (tagConfig) {
    let { typesSource, capturesOuterScope } = tagConfig;
    let tagName = tag.node.name;
    let { quasis } = path.node.quasi;

    assert(quasis.length === 1, 'No interpolated values in template strings');
    assert(path.node.start, 'Missing location info');
    assert(path.node.end, 'Missing location info');

    // Pad the template to account for the tag and surrounding ` characters
    let template = `${''.padStart(tagName.length)} ${quasis[0].value.raw} `;

    // Emit a use of the template tag so it's not considered unused
    let preamble = [`${tagName};`];

    let { inClass, className, typeParams, contextType } = getContainingTypeInfo(path);
    let identifiersInScope = capturesOuterScope ? Object.keys(path.scope.getAllBindings()) : [];
    let transformedTemplate = templateToTypescript(template, {
      typesPath: typesSource,
      preamble,
      identifiersInScope,
      typeParams,
      contextType,
      useJsDoc: isJsScript(script.filename),
    });

    if (inClass && !className) {
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
          location: addOffset(location, path.node.start),
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
      for (let { kind, location, areaOfEffect } of transformedTemplate.result.directives) {
        directives.push({
          kind: kind,
          source: script,
          location: addOffset(location, path.node.start),
          areaOfEffect: addOffset(areaOfEffect, path.node.start),
        });
      }

      partialSpans.push({
        originalFile: script,
        originalStart: path.node.start,
        originalLength: path.node.end - path.node.start,
        insertionPoint: path.node.start,
        transformedSource: transformedTemplate.result.code,
        mapping: transformedTemplate.result.mapping,
      });
    }
  }

  return { errors, directives, partialSpans };
}

function addOffset(location: Range, offset: number): Range {
  return {
    start: location.start + offset,
    end: location.end + offset,
  };
}

function getConfigForTag(
  path: NodePath<t.Identifier>,
  environment: GlintEnvironment
): GlintTagConfig | undefined {
  for (let [importSource, tags] of Object.entries(environment.getConfiguredTemplateTags())) {
    for (let [importSpecifier, tagConfig] of Object.entries(tags)) {
      if (path.referencesImport(importSource, importSpecifier)) {
        return tagConfig;
      }
    }
  }
}
